# SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
"""Thermal inerting by critical adiabatic flame temperature (PRD §5.6; SFPE/Beyler).

SU1  sum_i n_i [h_i(T_ad) - h_i(T_inf)] = n_O2 * dH_O2 * M_O2      (dH_O2 = 13.1 MJ/kg O2, Huggett)
     per mole of oxidizer mixture at stoichiometric burning: O2 is replaced by CO2 + H2O from the fuel
     CxHyOz (x/(x+y/4-z/2) and (y/2)/(x+y/4-z/2) mol per mol O2); N2 and agent are heated as inerts.
SU2  extinguished iff T_ad <= T_crit; solve x_agent such that T_ad(dilute(base, agent, x_agent)) = T_crit
T_crit,1g = SU1 T_ad of n-heptane at its cup-burner N2 MEC dispersed into air (same T_ad convention as
the ug fit; the 1500-1600 K literature value uses a different convention). T_crit,ug fitted per fuel to FLEX O2/N2 LOIs (V1, V2);
CO2 and He LOIs (V3, V4, V4b) are held out for validation. Pure thermal theory ignores CO2 radiation
re-absorption, chemical effects and He's high diffusivity (Lewis number) — see Evidence Gaps.
"""
from __future__ import annotations

from scipy.optimize import brentq

from . import thermo
from .io import fuel, load_params, prop

EQ = ["SU1", "SU2"]
DH_O2 = prop("constants", "dH_O2")


def t_ad(fuel_name: str, x: dict[str, float], T_inf: float, dH_O2: float = DH_O2) -> float:
    f = fuel(fuel_name)["formula"]
    nu = thermo.o2_per_fuel_mol(f)
    n_o2 = x["O2"]
    prod = {k: v for k, v in x.items() if k != "O2"}
    prod["CO2"] = prod.get("CO2", 0.0) + n_o2 * f.get("C", 0) / nu
    prod["H2O"] = prod.get("H2O", 0.0) + n_o2 * f.get("H", 0) / 2 / nu
    q = n_o2 * dH_O2 * thermo.molar_mass("O2")
    resid = lambda T: sum(n * thermo.dh_sensible(s, T_inf, T) for s, n in prod.items()) - q  # noqa: E731
    return brentq(resid, T_inf, 6000.0, xtol=1e-9)


def agent_fraction(fuel_name: str, base: dict[str, float], agent: str, T_crit: float, T_inf: float,
                   dH_O2: float = DH_O2) -> float:
    """Agent mole fraction (of the final mixture) that brings T_ad to T_crit. 0 if already inert."""
    g = lambda xa: t_ad(fuel_name, thermo.dilute_into(base, agent, xa), T_inf, dH_O2) - T_crit  # noqa: E731
    if g(0.0) <= 0:
        return 0.0
    return brentq(g, 0.0, 0.999, xtol=1e-10)


def loi_thermal(fuel_name: str, T_crit: float, T_inf: float, agent: str | None = None, base_o2: float = 0.21) -> float:
    """O2 mole fraction at which T_ad = T_crit (agent=None: O2/N2; else agent dispersed into air)."""
    if agent is None:
        return brentq(lambda z: t_ad(fuel_name, {"O2": z, "N2": 1 - z}, T_inf) - T_crit, 0.01, 0.99, xtol=1e-10)
    xa = agent_fraction(fuel_name, {"O2": base_o2, "N2": 1 - base_o2}, agent, T_crit, T_inf)
    return base_o2 * (1 - xa)


def t_crit_1g(T_inf: float, mec: float | None = None) -> float:
    """1 g reference: T_ad of n-heptane at the cup-burner N2 MEC dispersed into air."""
    mec = prop("suppression", "cup_burner_N2_MEC_heptane") if mec is None else mec
    return t_ad("n-heptane", thermo.dilute_into({"O2": 0.21, "N2": 0.79}, "N2", mec), T_inf)


def t_crit(fuel_name: str, regime: str, T_inf: float = 298.15) -> float:
    """regime 'ug' (fitted, needs params/suppression.json) or '1g' (cup-burner derived)."""
    if regime == "1g":
        return t_crit_1g(T_inf)
    p = load_params("suppression")
    if p is None:
        raise RuntimeError("run fit/fit_suppression.py first")
    return float(p["fuels"][fuel_name]["T_crit_ug"])
