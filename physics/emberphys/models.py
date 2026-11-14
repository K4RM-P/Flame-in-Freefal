"""run_* wrappers: every model returns a ModelResult with p05/p50/p95, validity and sources."""
from __future__ import annotations

import math
from typing import Any

import numpy as np

from . import droplet as D
from . import gravity as G
from . import habitat as H
from . import smoke as SM
from . import spread as SP
from . import suppression as SU
from . import thermo
from .flame_temp import flame_temperature
from .io import ModelResult, fuel, load_params, load_yaml, prop
from .uq import monte_carlo, sample_dist
from .validity import check

T_AMB = prop("constants", "T_amb")
CAVEAT_G = "PSI contains microgravity and 1 g data only; partial-gravity values are bounded estimates."


def _dist(material: str, key: str) -> tuple[float, dict | None]:
    e = fuel(material)[key]
    return float(e["value"]), e.get("dist")


def make_atm(x_o2: float, diluent: str = "N2", x_dil: float = 0.0) -> dict[str, float]:
    return thermo.atmosphere(x_o2, diluent, x_dil)


def run_droplet(fuel_name: str, x_o2: float, P_kPa: float, d0_mm: float, diluent: str = "N2", x_dil: float = 0.0,
                n_mc: int = 300, seed: int = 20261114) -> ModelResult:
    x = make_atm(x_o2, diluent, x_dil)
    P = P_kPa * 1e3
    pp = load_params("droplet")
    fp = pp["fuels"][fuel_name] if pp and fuel_name in pp["fuels"] else None
    p = D.DropletParams.for_fuel(fuel_name)
    st = D.state(fuel_name, x, P, T_AMB, p)
    dd, dr, gmax = D.extinction_diameters(fuel_name, x, P, T_AMB, p)
    cov = np.array(fp["cov"]) if fp else None

    def mc(rng: np.random.Generator) -> float:
        props = {k: sample_dist(rng, *_dist(fuel_name, k)) for k in ("dHc", "h_fg")}
        q = D.DropletParams(**vars(p))
        if fp:
            q.f_k = p.f_k * math.exp(rng.normal(0, fp["param_sd"]["ln_f_k"]))
        return D.state(fuel_name, x, P, T_AMB, q, props).K * 1e6

    unc = monte_carlo(mc, n_mc, seed)
    ext_samples = []
    if fp is not None:
        rng = np.random.default_rng(seed)
        for _ in range(min(n_mc, 200)):
            z = rng.multivariate_normal([p.ln_CD, math.log(p.a_eff)], cov)
            q = D.DropletParams(f_k=p.f_k, f_T=p.f_T, ln_CD=float(z[0]), a_eff=math.exp(z[1]))
            a, b, _ = D.extinction_diameters(fuel_name, x, P, T_AMB, q)
            ext_samples.append((a, b))
    from .uq import percentiles
    burning = dd is not None and (dr is None or d0_mm * 1e-3 < dr) and d0_mm * 1e-3 > (dd or 0)
    env = fp["envelope"] if fp else None
    return ModelResult(
        model_id="droplet", value=st.K * 1e6, units="mm^2/s", uncertainty=unc,
        inputs={"fuel": fuel_name, "x_o2": x_o2, "P_kPa": P_kPa, "p_o2_kPa": x_o2 * P_kPa, "d0_mm": d0_mm,
                "diluent": diluent, "x_diluent": x_dil},
        equation_ids=D.EQ,
        assumptions=["quasi-steady d2-law, spherically symmetric (microgravity, no convection)",
                     "film rule T_bar = (T_boil + T_f)/2 with fitted conductivity factor f_k",
                     "optically thin radiation from a hot shell ∝ r_f^3; one-step Arrhenius kinetics",
                     "no fuel-vapour accumulation, no soot dynamics, no cool-flame chemistry"],
        validity=check(env, {"x_o2": x_o2, "pressure_kpa": P_kPa, "d0_mm": d0_mm}) | {"calibrated": fp is not None},
        sources=["turns", "chao-law-tien-1990", "ntrs-20150023456", "dietrich-2014", "westbrook-dryer-1981"],
        extra={"B": st.B, "standoff_ratio": st.standoff, "T_f0_K": st.T_f0,
               "d_ext_diffusive_mm": dd * 1e3 if dd else None, "d_ext_radiative_mm": dr * 1e3 if dr else None,
               "d_ext_diffusive_unc": percentiles([a * 1e3 for a, _ in ext_samples if a]) if ext_samples else None,
               "d_ext_radiative_unc": percentiles([b * 1e3 for _, b in ext_samples if b]) if ext_samples else None,
               "sustained_burning_predicted": bool(burning),
               "cool_flame_possible": D.cool_flame_flag(fuel_name, d0_mm * 1e-3, dr),
               "burn_time_s": (d0_mm**2 - (dd * 1e3 if dd else 0) ** 2) / (st.K * 1e6) if burning else None},
    )


def run_suppression(fuel_name: str, x_o2: float, P_kPa: float, agent: str = "CO2", n_mc: int = 500,
                    seed: int = 20261114) -> ModelResult:
    base = {"O2": x_o2, "N2": 1 - x_o2}
    pp = load_params("suppression")
    tc_ug = SU.t_crit(fuel_name, "ug") if pp and fuel_name in pp["fuels"] else None
    tc_1g = SU.t_crit(fuel_name, "1g", T_AMB)
    x1 = SU.agent_fraction(fuel_name, base, agent, tc_1g, T_AMB)
    xu = SU.agent_fraction(fuel_name, base, agent, tc_ug, T_AMB) if tc_ug else None
    mec = load_yaml("properties")["suppression"]["cup_burner_N2_MEC_heptane"]
    dH = load_yaml("properties")["constants"]["dH_O2"]

    def mc(rng: np.random.Generator) -> float:
        tc = rng.normal(tc_ug, pp["fuels"][fuel_name]["T_crit_ug_sd"]) if tc_ug else SU.t_crit_1g(T_AMB, sample_dist(rng, mec["value"], mec["dist"]))
        return SU.agent_fraction(fuel_name, base, agent, tc, T_AMB, sample_dist(rng, dH["value"], dH["dist"]))

    unc = monte_carlo(mc, n_mc, seed)
    unc1 = monte_carlo(lambda r: SU.agent_fraction(fuel_name, base, agent, SU.t_crit_1g(T_AMB, sample_dist(r, mec["value"], mec["dist"])),
                                                    T_AMB, sample_dist(r, dH["value"], dH["dist"])), n_mc, seed)
    return ModelResult(
        model_id="suppression", value=xu if xu is not None else x1, units="agent mole fraction",
        uncertainty=unc, inputs={"fuel": fuel_name, "x_o2": x_o2, "P_kPa": P_kPa, "p_o2_kPa": x_o2 * P_kPa, "agent": agent},
        equation_ids=SU.EQ,
        assumptions=["pure thermal theory: stoichiometric adiabatic flame temperature must stay above T_crit",
                     "agent dispersed into the base atmosphere (x_i = x_i,base (1 - x_agent))",
                     "no chemical inhibition, no CO2 radiation re-absorption, unity Lewis number (He effect not captured)",
                     "T_crit,ug fitted per fuel to FLEX O2/N2 droplet LOIs; independent of pressure (FLEX 1 atm)"],
        validity={"in_envelope": abs(P_kPa - 101.3) < 35 and fuel_name in (pp or {}).get("fuels", {}),
                  "nearest_data_distance": None, "calibrated": tc_ug is not None},
        sources=["sfpe-beyler", "nfpa-2001", "huggett-1980", "gri30", "dietrich-2014"],
        extra={"x_agent_1g": x1, "x_agent_ug": xu, "uncertainty_1g": unc1, "T_crit_1g_K": tc_1g, "T_crit_ug_K": tc_ug,
               "T_ad_base_K": SU.t_ad(fuel_name, base, T_AMB),
               "o2_at_extinction_ug": x_o2 * (1 - xu) if xu is not None else None,
               "ug_margin": (xu - x1) if xu is not None else None},
    )


def run_spread(material: str, x_o2: float, P_kPa: float, flow_cm_s: float, thickness_mm: float | None = None,
               gravity_g: float = 0.0, orientation: str = "opposed", n_mc: int = 500, seed: int = 20261114) -> ModelResult:
    x = make_atm(x_o2)
    P = P_kPa * 1e3
    th = thickness_mm * 1e-3 if thickness_mm is not None else None
    sp = SP.SpreadParams.for_material(material)
    r = SP.spread_rate(material, x, P, flow_cm_s / 100, T_AMB, th, sp)
    u_b = G.buoyant_velocity(gravity_g, x, P, r["T_f"], T_AMB) if gravity_g > 0 else 0.0
    V_eq = G.equivalent_flow(flow_cm_s / 100, u_b, orientation)
    r_eq = SP.spread_rate(material, x, P, V_eq, T_AMB, th, sp)
    f = fuel(material)

    def mc(rng: np.random.Generator) -> float:
        props = {k: sample_dist(rng, float(f[k]["value"]), f[k].get("dist")) for k in ("T_v", "c_s", "k_s", "dHc") if k in f}
        return SP.spread_rate(material, x, P, V_eq, T_AMB, th, sp, props)["V_f"] * 1e3

    unc = monte_carlo(mc, n_mc, seed)
    calibrated = sp.mu is not None
    return ModelResult(
        model_id="spread", value=r_eq["V_f"] * 1e3, units="mm/s", uncertainty=unc,
        inputs={"material": material, "x_o2": x_o2, "P_kPa": P_kPa, "p_o2_kPa": x_o2 * P_kPa, "flow_cm_s": flow_cm_s,
                "thickness_mm": th * 1e3 if th else None, "gravity_g": gravity_g, "orientation": orientation},
        equation_ids=SP.EQ + (G.EQ if gravity_g > 0 else []),
        assumptions=["de Ris opposed-flow theory with Burke-Schumann T_f (overpredicts; no radiative loss)",
                     "thin fabric: SP1 only; thick plastic: smooth max of thin/thick limits",
                     "F(Da) finite-rate correction OFF until fitted to BASS-II (uncalibrated: theory only)" if not calibrated
                     else "F(Da) fitted to BASS-II train split",
                     CAVEAT_G if gravity_g > 0 else "microgravity forced flow"],
        validity={"in_envelope": False, "nearest_data_distance": None, "calibrated": calibrated,
                  "note": "Uncalibrated — theory only (BASS-II/Saffire digitization pending)" if not calibrated else "",
                  "quench_warning": SP.quench_warning(V_eq)},
        sources=["de-ris-1969", "quintiere-ffp", "fernandez-pello-1981", "bass2-sci-rep-2017"] + (["olson-1991"] if gravity_g > 0 else []),
        extra={"band_mm_s": [r["V_f"] * 1e3, r_eq["V_f"] * 1e3], "u_b_cm_s": u_b * 100, "V_eq_cm_s": V_eq * 100,
               "T_f_K": r["T_f"], "V_thin_mm_s": r_eq["V_thin"] * 1e3, "V_thick_mm_s": r_eq["V_thick"] * 1e3,
               "regime_ratio": r_eq["regime_ratio"], "lnDa": r_eq["lnDa"], "label": "bounded estimate" if gravity_g > 0 else ""},
    )


def run_gravity(x_o2: float, P_kPa: float, flow_cm_s: float, gravity_g: float, material: str = "sibal",
                orientation: str = "opposed") -> ModelResult:
    x = make_atm(x_o2)
    P = P_kPa * 1e3
    pr = SP.solid_props(material)
    T_f = flame_temperature(material, x, T_AMB, T_v=pr["T_v"])
    u_b = G.buoyant_velocity(gravity_g, x, P, T_f, T_AMB)
    presets = {k: G.buoyant_velocity(g, x, P, T_f, T_AMB) * 100 for k, g in G.PRESETS.items()}
    V_eq = G.equivalent_flow(flow_cm_s / 100, u_b, orientation) * 100
    return ModelResult(
        model_id="gravity", value=V_eq, units="cm/s", uncertainty={"p05": flow_cm_s, "p50": V_eq, "p95": V_eq},
        inputs={"x_o2": x_o2, "P_kPa": P_kPa, "flow_cm_s": flow_cm_s, "gravity_g": gravity_g, "material": material, "orientation": orientation},
        equation_ids=G.EQ + ["BS2"],
        assumptions=[CAVEAT_G, "band = [forced flow only (ug), forced + buoyant (equivalent)]",
                     "T_f from uncalibrated Burke-Schumann (upper bound on u_b)"],
        validity={"in_envelope": gravity_g in (0.0, 1.0), "nearest_data_distance": None, "calibrated": False,
                  "note": "bounded estimate — no partial-gravity PSI data"},
        sources=["fernandez-pello-1981", "olson-1991", "ntrs-20250010653", "ntrs-20240015307"],
        extra={"u_b_cm_s": u_b * 100, "u_b_presets_cm_s": presets, "band_cm_s": [flow_cm_s, V_eq], "label": "bounded estimate"},
    )


def run_habitat(material: str, x_o2: float, P_kPa: float, V_m3: float, Q_kW: float, t_burn_s: float,
                t_end_s: float = 1800.0, growth_s: float = 0.0, scrubber: bool = False, n_mc: int = 60,
                seed: int = 20261114) -> ModelResult:
    inp = H.HabitatInputs(material, x_o2, P_kPa * 1e3, V_m3, Q_kW * 1e3, t_burn_s, t_end_s, growth_s, scrubber=scrubber)
    res = H.simulate(inp)
    hp = load_yaml("properties")["habitat"]
    f = fuel(material)

    def mc(rng: np.random.Generator) -> float:
        i2 = H.HabitatInputs(**vars(inp))
        i2.h_w = sample_dist(rng, hp["h_w"]["value"], hp["h_w"]["dist"])
        i2.chi = sample_dist(rng, hp["chi_r_lost"]["value"], hp["chi_r_lost"]["dist"])
        i2.y_CO = sample_dist(rng, float(f["y_CO"]["value"]), f["y_CO"].get("dist"))
        return float(H.simulate(i2, 61)["T"].max() - inp.T0)

    unc = monte_carlo(mc, n_mc, seed)
    lim = H.time_to_limits(res)
    return ModelResult(
        model_id="habitat", value=float(res["T"].max() - inp.T0), units="K (peak cabin temperature rise)", uncertainty=unc,
        inputs={"material": material, "x_o2": x_o2, "P_kPa": P_kPa, "V_m3": V_m3, "Q_kW": Q_kW, "t_burn_s": t_burn_s,
                "t_end_s": t_end_s, "growth_s": growth_s, "scrubber": scrubber},
        equation_ids=H.EQ,
        assumptions=["single well-mixed zone, fixed volume, no leakage or venting",
                     "O2 consumption 13.1 MJ/kg O2 (Huggett); CO2/H2O from fuel stoichiometry; CO from yield y_CO",
                     "wall loss h_w A_w (T - T_w) with h_w UNCALIBRATED (Saffire fit pending)"],
        validity={"in_envelope": Q_kW <= 10 and V_m3 <= 400, "nearest_data_distance": None, "calibrated": False,
                  "note": "Uncalibrated — theory only (Saffire IV-V vehicle data pending)"},
        sources=["huggett-1980", "gri30", "jsc-20584-revC", "nasa-std-3001-v2", "ntrs-20210011521"],
        extra={"series": {k: v.tolist() for k, v in res.items()}, "time_to_1h_limit_s": lim,
               "peak_dP_kPa": float((res["P"].max() - inp.P) / 1e3), "min_x_o2": float(res["x_o2"].min()),
               "peak_x_co2": float(res["x_co2"].max()), "peak_co_ppm": float(res["x_co"].max() * 1e6)},
    )


def run_smoke(transport_s: float, N0: float | None = None, d0_nm: float | None = None, P_kPa: float = 101.3) -> ModelResult:
    N0 = N0 if N0 is not None else prop("smoke", "N0_default")
    d0 = (d0_nm if d0_nm is not None else prop("smoke", "d0_default_nm")) * 1e-9
    r = SM.age(transport_s, N0, d0, T_AMB, P_kPa * 1e3)
    return ModelResult(
        model_id="smoke", value=r["d30"] * 1e9, units="nm (volume-mean diameter)",
        uncertainty={"p05": r["d10"] * 1e9, "p50": r["d30"] * 1e9, "p95": r["d43"] * 1e9},
        inputs={"transport_s": transport_s, "N0_m3": N0, "d0_nm": d0 * 1e9, "P_kPa": P_kPa},
        equation_ids=SM.EQ,
        assumptions=["monodisperse-equivalent Brownian coagulation with constant K_c(d0)",
                     "self-preserving lognormal width sigma_g for d10/d43", "N0, d0 UNCALIBRATED (SAME-R fit pending)"],
        validity={"in_envelope": False, "nearest_data_distance": None, "calibrated": False,
                  "note": "Uncalibrated — theory only; SAME-R reports averages mostly 200-400 nm"},
        sources=["seinfeld-pandis", "same-r"],
        extra={"d10_nm": r["d10"] * 1e9, "d43_nm": r["d43"] * 1e9, "N_m3": r["N"], "K_c": r["K_c"],
               "favoured_detector": SM.favoured_detector(r["d43"])},
    )


def summary(r: ModelResult) -> dict[str, Any]:
    return r.to_dict()
