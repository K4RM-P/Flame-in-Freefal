# SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
"""Droplet combustion (PRD §5.5): d2-law, standoff, dual (diffusive/radiative) extinction, LOI.

DR1  K = 8 k_g / (rho_l cp_g) ln(1 + B)                         (Turns Ch. 10)
DR2  B = [dHc Y_O/s + cp_g (T_inf - T_boil)] / h_fg
DR3  r_f / r_s = ln(1 + B) / ln(1 + Y_O/s)
DR4  chi_r = (32/3) a_eff (P/P_atm) sigma (T_f0^4 - T_inf^4) r_f^3 / (rho_l r_s K dHc)
     (optically-thin emission from a hot shell of volume ∝ r_f^3 over heat release pi rho_l r_s K dHc / 2)
DR5  T_f(d) = T_f0 - chi_r (T_f0 - T_inf)
DR6  ln Da = ln C_D + ln(r_f^2 rho_g Y_O / alpha_g) - E/(R T_f(d));  flame survives iff ln Da >= 0
     (Damköhler extinction with radiative temperature loss: Chao, Law & T'ien 1990 dual-extinction picture)
DR7  LOI = O2 level at which max_d ln Da = 0 (the diffusive and radiative extinction diameters meet)

Film rule: k_g, cp_g, rho_g, alpha_g of the ambient gas at T_bar = (T_boil + T_f0)/2; f_k is a
fitted effective-conductivity factor (classic theory overpredicts K; fuel vapour transport is ignored).
Calibrated per fuel: f_k (K data), ln C_D and a_eff (FLEX extinction diameters, train split only).
"""
from __future__ import annotations

import math
from dataclasses import dataclass

from scipy.optimize import brentq, minimize_scalar

from . import thermo
from .flame_temp import flame_temperature
from .io import fuel, load_params, prop

EQ = ["DR1", "DR2", "DR3", "DR4", "DR5", "DR6", "DR7", "BS1", "BS2"]
SIGMA = prop("constants", "sigma_SB")
P_ATM = prop("constants", "P_atm")


@dataclass
class DropletParams:
    f_k: float = 1.0
    f_T: float = 1.0
    ln_CD: float = 25.0
    a_eff: float = 0.5

    @classmethod
    def for_fuel(cls, fuel_name: str) -> "DropletParams":
        p = load_params("droplet")
        if p and fuel_name in p["fuels"]:
            return cls(**p["fuels"][fuel_name]["params"])
        return cls(a_eff=prop("droplet", "a_eff_prior"))


@dataclass
class DropletState:
    K: float          # m2/s
    B: float
    standoff: float
    T_f0: float
    T_bar: float
    k_g: float
    cp_g: float
    rho_g: float
    alpha_g: float
    y_o: float


def state(fuel_name: str, x: dict[str, float], P: float, T_inf: float, p: DropletParams,
          props: dict[str, float] | None = None) -> DropletState:
    f = fuel(fuel_name)
    pr = {k: float(f[k]["value"]) for k in ("dHc", "T_boil", "h_fg", "rho_l")}
    if props:
        pr.update(props)
    s = thermo.stoich_s(f["formula"])
    y_o = thermo.mole_to_mass(x)["O2"]
    T_f0 = flame_temperature(fuel_name, x, T_inf, T_v=pr["T_boil"], f_T=p.f_T, dHc=pr["dHc"])
    T_bar = 0.5 * (pr["T_boil"] + T_f0)
    k_g = p.f_k * thermo.k_mix(x, T_bar)
    cp_g = thermo.cp_mass_mix(x, T_bar)
    rho_g = thermo.density(x, T_bar, P)
    alpha_g = thermo.k_mix(x, T_bar) / (rho_g * cp_g)
    B = (pr["dHc"] * y_o / s + cp_g * (T_inf - pr["T_boil"])) / pr["h_fg"]
    K = 8.0 * k_g / (pr["rho_l"] * cp_g) * math.log1p(B)
    standoff = math.log1p(B) / math.log1p(y_o / s)
    return DropletState(K, B, standoff, T_f0, T_bar, k_g, cp_g, rho_g, alpha_g, y_o)


def burning_rate(fuel_name: str, x: dict[str, float], P: float, T_inf: float,
                 p: DropletParams | None = None) -> float:
    """K in m2/s (DR1)."""
    return state(fuel_name, x, P, T_inf, p or DropletParams.for_fuel(fuel_name)).K


def ln_da(d: float, st: DropletState, fuel_name: str, P: float, T_inf: float, p: DropletParams,
          props: dict[str, float] | None = None) -> float:
    f = fuel(fuel_name)
    rho_l = float(f["rho_l"]["value"]) if not props or "rho_l" not in props else props["rho_l"]
    dHc = float(f["dHc"]["value"]) if not props or "dHc" not in props else props["dHc"]
    E = float(f["E_a"]["value"])
    r_s = 0.5 * d
    r_f = st.standoff * r_s
    chi = (32.0 / 3.0) * p.a_eff * (P / P_ATM) * SIGMA * (st.T_f0**4 - T_inf**4) * r_f**3 / (rho_l * r_s * st.K * dHc)
    T_f = max(st.T_f0 - chi * (st.T_f0 - T_inf), T_inf + 1.0)
    return p.ln_CD + math.log(r_f**2 * st.rho_g * st.y_o / st.alpha_g) - E / (thermo.R * T_f)


def extinction_diameters(fuel_name: str, x: dict[str, float], P: float, T_inf: float,
                         p: DropletParams | None = None, props: dict[str, float] | None = None
                         ) -> tuple[float | None, float | None, float]:
    """(d_diffusive_ext, d_radiative_ext, max ln Da) in m. (None, None, g) if no burning possible."""
    p = p or DropletParams.for_fuel(fuel_name)
    st = state(fuel_name, x, P, T_inf, p, props)
    g = lambda lnd: ln_da(math.exp(lnd), st, fuel_name, P, T_inf, p, props)  # noqa: E731
    lo, hi = math.log(1e-6), math.log(0.5)
    res = minimize_scalar(lambda z: -g(z), bounds=(lo, hi), method="bounded", options={"xatol": 1e-9})
    zmax, gmax = res.x, -res.fun
    if gmax < 0:
        return None, None, gmax
    d_diff = math.exp(brentq(g, lo, zmax, xtol=1e-12)) if g(lo) < 0 else None
    d_rad = math.exp(brentq(g, zmax, hi, xtol=1e-12)) if g(hi) < 0 else None
    return d_diff, d_rad, gmax


def loi(fuel_name: str, P: float, T_inf: float, agent: str | None = None,
        p: DropletParams | None = None, base_o2: float = 0.21) -> float:
    """Limiting oxygen index (DR7). agent=None: O2/N2 mixtures; else agent dispersed into air."""
    p = p or DropletParams.for_fuel(fuel_name)

    def atm(z: float) -> dict[str, float]:
        if agent is None:
            return {"O2": z, "N2": 1.0 - z}
        return thermo.dilute_into({"O2": base_o2, "N2": 1.0 - base_o2}, agent, 1.0 - z / base_o2)

    gm = lambda z: extinction_diameters(fuel_name, atm(z), P, T_inf, p)[2]  # noqa: E731
    hi = 0.999 if agent is None else base_o2
    lo = 0.02
    if gm(hi) < 0:
        return float("nan")
    if gm(lo) > 0:
        return lo
    return brentq(gm, lo, hi, xtol=1e-7)


def cool_flame_flag(fuel_name: str, d0: float, d_rad: float | None) -> bool:
    """FLEX/CFI: large n-alkane droplets can sustain a cool flame after hot-flame radiative extinction."""
    return fuel_name.startswith("n-") and d_rad is not None and d0 >= d_rad
