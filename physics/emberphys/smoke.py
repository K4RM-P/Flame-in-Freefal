# SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
"""Smoke aging by Brownian coagulation (PRD §5.8), monodisperse-equivalent Smoluchowski.

SM1  N(t) = N0 / (1 + K_c N0 t / 2);   d(t) = d0 (N0/N)^(1/3)
SM2  K_c = (8 k_B T / (3 mu)) C_c(d0);   C_c = 1 + Kn (1.257 + 0.4 exp(-1.1/Kn)),  Kn = 2 lambda/d
     lambda = 2 mu / (P sqrt(8 M/(pi R T)))   (Seinfeld & Pandis)
SM4  v_s = rho_p g d^2 C_c(d) / (18 mu)   (Stokes settling with slip correction; g = g_rel * g0)
SM3  self-preserving lognormal (sigma_g): d10 = d_g e^{0.5 s^2}, d43 = d_g e^{3.5 s^2}, d30 = d_g e^{1.5 s^2}
     with the monodisperse-equivalent d(t) identified as d30 (volume-mean).
"""
from __future__ import annotations

import math

from . import thermo
from .io import prop

EQ = ["SM1", "SM2", "SM3", "SM4"]


def slip(d: float, T: float, P: float) -> float:
    """Cunningham slip correction C_c(d) with the pressure-dependent mean free path (SM2)."""
    mu = thermo.mu_air(T)
    M = thermo.mix_M({"O2": 0.21, "N2": 0.79})
    lam = 2 * mu / (P * math.sqrt(8 * M / (math.pi * thermo.R * T)))
    Kn = 2 * lam / d
    return 1 + Kn * (1.257 + 0.4 * math.exp(-1.1 / Kn))


def coag_coeff(d: float, T: float, P: float) -> float:
    return 8 * prop("constants", "k_B") * T / (3 * thermo.mu_air(T)) * slip(d, T, P)


def settling_velocity(d: float, g_rel: float, T: float, P: float, rho_p: float | None = None) -> float:
    """SM4: terminal settling speed (m/s) of a particle of diameter d at g_rel x standard gravity."""
    rho = prop("smoke", "particle_density") if rho_p is None else rho_p
    return rho * g_rel * prop("constants", "g0") * d ** 2 * slip(d, T, P) / (18 * thermo.mu_air(T))


def age(t: float, N0: float, d0: float, T: float, P: float) -> dict[str, float]:
    K = coag_coeff(d0, T, P)
    N = N0 / (1 + 0.5 * K * N0 * t)
    d30 = d0 * (N0 / N) ** (1 / 3)
    s2 = math.log(prop("smoke", "sigma_g")) ** 2
    dg = d30 / math.exp(1.5 * s2)
    return {"N": N, "d30": d30, "d10": dg * math.exp(0.5 * s2), "d43": dg * math.exp(3.5 * s2), "K_c": K}


def favoured_detector(d43: float) -> str:
    return "photoelectric" if d43 * 1e9 >= prop("smoke", "photoelectric_threshold_nm") else "ionization"
