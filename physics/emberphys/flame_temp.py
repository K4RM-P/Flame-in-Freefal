"""Burke-Schumann diffusion-flame temperature (PRD §5.2).

BS1  Z_st = Y_O / (s Y_F0 + Y_O)
BS2  T_f = T_inf + Z_st (T_v - T_inf) + Z_st Y_F0 dHc / cp
cp is the oxidizer-stream mixture cp at the mean temperature (T_inf + T_f)/2 (fixed-point iteration).
Unity Lewis number, no dissociation, no radiation: overpredicts. f_T calibration factor scales the
temperature rise (T_f - T_inf); f_T = 1 is the uncalibrated value.
"""
from __future__ import annotations

from . import thermo
from .io import fuel

EQ = ["BS1", "BS2"]


def z_st(y_o: float, s: float, y_f0: float = 1.0) -> float:
    return y_o / (s * y_f0 + y_o)


def flame_temperature(fuel_name: str, x: dict[str, float], T_inf: float, T_v: float | None = None,
                      f_T: float = 1.0, dHc: float | None = None, n_iter: int = 30) -> float:
    f = fuel(fuel_name)
    s = thermo.stoich_s(f["formula"])
    dHc = float(f["dHc"]["value"]) if dHc is None else dHc
    if T_v is None:
        T_v = float((f.get("T_boil") or f.get("T_v"))["value"])
    y_o = thermo.mole_to_mass(x)["O2"]
    z = z_st(y_o, s)
    Tf = T_inf + 1500.0
    for _ in range(n_iter):
        cp = thermo.cp_mass_mix(x, 0.5 * (T_inf + Tf))
        Tf_new = T_inf + z * (T_v - T_inf) + z * dHc / cp
        if abs(Tf_new - Tf) < 1e-10:
            Tf = Tf_new
            break
        Tf = Tf_new
    return T_inf + f_T * (Tf - T_inf)
