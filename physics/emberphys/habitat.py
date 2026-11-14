# SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
"""Closed-volume well-mixed habitat fire consequence model (PRD §5.9).

HA1  (sum n_i c_v,i) dT/dt = (1 - chi) Q(t) - h_w A_w (T - T_w)
HA2  dn_O2/dt = -Q/(dH_O2 M_O2)                         (Huggett oxygen consumption)
HA3  mdot_F = Q/dHc;  dn_CO/dt = y_CO mdot_F / M_CO;  dn_CO2/dt = x_C mdot_F/M_F - dn_CO/dt - lambda_s n_CO2 (scrubber)
     dn_H2O/dt = (y_H/2) mdot_F / M_F
HA4  P = n_tot R T / V   (fixed volume; with h_w = 0 and no mole change, dP/P = dT/T)
Q(t): constant Q_peak, or t^2 growth Q = Q_peak (t/t_g)^2 capped at Q_peak; zero after t_burn.
"""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from scipy.integrate import solve_ivp

from . import thermo
from .io import fuel, load_yaml, prop

EQ = ["HA1", "HA2", "HA3", "HA4"]
SP = ("O2", "N2", "CO2", "H2O", "CO")


@dataclass
class HabitatInputs:
    material: str
    x_o2: float
    P: float            # Pa
    V: float            # m3
    Q_peak: float       # W
    t_burn: float       # s
    t_end: float        # s
    growth_time: float = 0.0   # s; 0 => constant
    T0: float = 298.15
    h_w: float | None = None
    chi: float | None = None
    scrubber: bool = False
    dH_O2: float | None = None
    y_CO: float | None = None


def q_of_t(t: float, inp: HabitatInputs) -> float:
    if t > inp.t_burn:
        return 0.0
    if inp.growth_time > 0:
        return inp.Q_peak * min(1.0, (t / inp.growth_time) ** 2)
    return inp.Q_peak


def simulate(inp: HabitatInputs, n_out: int = 121) -> dict[str, np.ndarray]:
    R = thermo.R
    f = fuel(inp.material)
    form = f["formula"]
    M_F = thermo.fuel_molar_mass(form)
    dHc = float(f["dHc"]["value"])
    y_CO = float(f["y_CO"]["value"]) if inp.y_CO is None else inp.y_CO
    dH_O2 = prop("constants", "dH_O2") if inp.dH_O2 is None else inp.dH_O2
    h_w = prop("habitat", "h_w") if inp.h_w is None else inp.h_w
    chi = prop("habitat", "chi_r_lost") if inp.chi is None else inp.chi
    A_w = prop("habitat", "wall_area_factor") * inp.V ** (2.0 / 3.0)
    T_w = prop("habitat", "T_wall")
    lam = prop("habitat", "scrubber_rate") if inp.scrubber else 0.0
    n0 = inp.P * inp.V / (R * inp.T0)
    y0 = [inp.T0, n0 * inp.x_o2, n0 * (1 - inp.x_o2), 0.0, 0.0, 0.0]
    M = {s: thermo.molar_mass(s) for s in SP}

    def rhs(t: float, y: np.ndarray) -> list[float]:
        T, nO2, nN2, nCO2, nH2O, nCO = y
        Q = q_of_t(t, inp) if nO2 > 0 else 0.0
        cv = sum(n * (thermo.cp_molar(s, T) - R) for s, n in zip(SP, (nO2, nN2, nCO2, nH2O, nCO)))
        mF = Q / dHc
        dCO = y_CO * mF / M["CO"]
        dT = ((1 - chi) * Q - h_w * A_w * (T - T_w)) / cv
        return [dT, -Q / (dH_O2 * M["O2"]), 0.0,
                form.get("C", 0) * mF / M_F - dCO - lam * nCO2,
                form.get("H", 0) / 2 * mF / M_F, dCO]

    t_eval = np.linspace(0, inp.t_end, n_out)
    sol = solve_ivp(rhs, (0, inp.t_end), y0, t_eval=t_eval, method="RK45", rtol=1e-9, atol=1e-12, max_step=max(inp.t_end / 400, 0.5))
    T, nO2, nN2, nCO2, nH2O, nCO = sol.y
    ntot = nO2 + nN2 + nCO2 + nH2O + nCO
    return {"t": sol.t, "T": T, "P": ntot * R * T / inp.V, "x_o2": nO2 / ntot, "x_co2": nCO2 / ntot,
            "x_co": nCO / ntot, "x_h2o": nH2O / ntot, "p_o2": nO2 * R * T / inp.V}


def time_to_limits(res: dict[str, np.ndarray], duration: str = "1h") -> dict[str, float | None]:
    lim = load_yaml("limits")
    out: dict[str, float | None] = {}
    for sp, key in (("CO", "x_co"), ("CO2", "x_co2")):
        thr = lim[sp]["ppm"][duration] * 1e-6
        idx = np.nonzero(res[key] >= thr)[0]
        out[sp] = float(res["t"][idx[0]]) if len(idx) else None
    thr = lim["O2_min"]["p_o2_kPa"] * 1e3
    idx = np.nonzero(res["p_o2"] <= thr)[0]
    out["O2"] = float(res["t"][idx[0]]) if len(idx) else None
    return out
