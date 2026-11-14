"""Opposed-flow flame spread over solids (PRD §5.3): de Ris thin/thick + Damköhler correction.

SP1  V_thin  = C_thin k_g (T_f - T_v) / (rho_s c_s d (T_v - T_inf))          C_thin = pi/4, d = FULL thickness
SP2  V_thick = V_g (k_g rho_g c_g)/(k_s rho_s c_s) ((T_f - T_v)/(T_v - T_inf))^2
SP3  V_deRis = (V_thin^n + V_thick^n)^(1/n)  (smooth max, n = 4) for thick_plastic; thin_fabric uses SP1 only
     (fabrics are thermally thin per PRD §5.3); regime ratio = d / heated depth alpha_s/V
SP4  ln Da = ln(alpha_g rho_g Y_O / V_r^2) - E/(R T_f),  V_r = V_g + V_deRis
SP5  V_f = V_deRis * F(Da),  F = 1/(1 + exp(-(ln Da - mu)/b))   (fitted to BASS-II; F = 1 until calibrated)
Gas properties at T_film = (T_f + T_inf)/2. rho_g ∝ P so thick spread ∝ P while thin spread is P-independent.
"""
from __future__ import annotations

import math
from dataclasses import dataclass

from . import thermo
from .flame_temp import flame_temperature
from .io import fuel, load_params, prop

EQ = ["SP1", "SP2", "SP3", "SP4", "SP5", "BS1", "BS2"]


@dataclass
class SpreadParams:
    f_T: float = 1.0
    mu: float | None = None   # None => F(Da) = 1 (uncalibrated)
    b: float = 1.0

    @classmethod
    def for_material(cls, material: str) -> "SpreadParams":
        p = load_params("spread")
        if p and material in p.get("materials", {}):
            return cls(**p["materials"][material]["params"])
        return cls()


def solid_props(material: str, thickness: float | None = None, props: dict[str, float] | None = None) -> dict[str, float]:
    f = fuel(material)
    pr = {k: float(f[k]["value"]) for k in ("T_v", "c_s", "k_s", "dHc", "E_a") if k in f}
    d = thickness if thickness is not None else float(f["thickness"]["value"]) if "thickness" in f else 1e-2
    if "areal_density" in f and thickness is None:
        pr["areal"] = float(f["areal_density"]["value"])
        pr["rho_s"] = pr["areal"] / d
    else:
        pr["rho_s"] = float(f["rho_s"]["value"]) if "rho_s" in f else float(f["areal_density"]["value"]) / d
        pr["areal"] = pr["rho_s"] * d
    pr["d"] = d
    if props:
        pr.update(props)
        pr["areal"] = pr["rho_s"] * pr["d"]
    return pr


def spread_rate(material: str, x: dict[str, float], P: float, V_g: float, T_inf: float,
                thickness: float | None = None, p: SpreadParams | None = None,
                props: dict[str, float] | None = None) -> dict[str, float]:
    """Returns dict with V_f, V_thin, V_thick, F, lnDa, T_f, regime_ratio (d / heated depth) in SI."""
    p = p or SpreadParams.for_material(material)
    pr = solid_props(material, thickness, props)
    T_v = pr["T_v"]
    T_f = flame_temperature(material, x, T_inf, T_v=T_v, f_T=p.f_T, dHc=pr["dHc"])
    Tfilm = 0.5 * (T_f + T_inf)
    k_g = thermo.k_mix(x, Tfilm)
    rho_g = thermo.density(x, Tfilm, P)
    c_g = thermo.cp_mass_mix(x, Tfilm)
    phi = (T_f - T_v) / (T_v - T_inf)
    C_thin = prop("spread", "C_thin")
    n = prop("spread", "blend_exponent")
    V_thin = C_thin * k_g * phi / (pr["areal"] * pr["c_s"])
    V_thick = V_g * (k_g * rho_g * c_g) / (pr["k_s"] * pr["rho_s"] * pr["c_s"]) * phi**2
    if fuel(material).get("material_class") == "thin_fabric":
        V_dr = V_thin
    else:
        V_dr = (V_thin**n + V_thick**n) ** (1.0 / n)
    alpha_g = k_g / (rho_g * c_g)
    y_o = thermo.mole_to_mass(x)["O2"]
    V_r = V_g + V_dr
    lnDa = math.log(alpha_g * rho_g * y_o / V_r**2) - pr["E_a"] / (thermo.R * T_f)
    F = 1.0 if p.mu is None else 1.0 / (1.0 + math.exp(-(lnDa - p.mu) / p.b))
    alpha_s = pr["k_s"] / (pr["rho_s"] * pr["c_s"])
    return {"V_f": V_dr * F, "V_thin": V_thin, "V_thick": V_thick, "V_deRis": V_dr, "F": F, "lnDa": lnDa,
            "T_f": T_f, "regime_ratio": pr["d"] / (alpha_s / max(V_dr * F, 1e-12))}


def quench_warning(V_g: float) -> bool:
    return V_g * 100.0 < prop("spread", "low_flow_quench_cm_s")
