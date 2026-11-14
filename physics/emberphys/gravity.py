"""Gravity-equivalent flow mapping (PRD §5.4). Partial-gravity outputs are BOUNDED ESTIMATES, never measured.

GR1  u_b = (g alpha_g (T_f - T_inf)/T_inf)^(1/3)       (Fernandez-Pello; Olson)
GR2  V_r,eq = U + u_b (opposed/downward), sqrt(U^2 + u_b^2) (crossflow)
alpha_g at T_film = (T_f + T_inf)/2 and ambient P (alpha ∝ 1/P).
"""
from __future__ import annotations

import math

from . import thermo
from .io import prop

EQ = ["GR1", "GR2"]
G0 = prop("constants", "g0")
PRESETS = {"ug": 0.0, "moon": 0.165, "mars": 0.378, "earth": 1.0}


def buoyant_velocity(g_earths: float, x: dict[str, float], P: float, T_f: float, T_inf: float) -> float:
    Tfilm = 0.5 * (T_f + T_inf)
    a = thermo.alpha(x, Tfilm, P)
    return (g_earths * G0 * a * (T_f - T_inf) / T_inf) ** (1.0 / 3.0)


def equivalent_flow(U: float, u_b: float, orientation: str = "opposed") -> float:
    return U + u_b if orientation == "opposed" else math.hypot(U, u_b)
