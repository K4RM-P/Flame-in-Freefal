# SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
"""Shared thermochemistry: NASA-7 cp/h (GRI-Mech 3.0), molar masses, transport, mixture conversions.

Eq ids: TH1 cp/R = a1 + a2 T + a3 T^2 + a4 T^3 + a5 T^4 ; TH2 h/RT NASA-7 integral;
TH3 Sutherland mu(T), k(T) for air; TH4 mixture conductivity 0.5(sum x k + 1/sum x/k);
TH5 ideal gas rho = P M / (R T); TH6 alpha = k/(rho cp).
"""
from __future__ import annotations

from functools import lru_cache

from .io import DATA, load_yaml, prop

R = prop("constants", "R_univ")
SPECIES = ("O2", "N2", "CO2", "H2O", "CO", "AR", "HE")


@lru_cache(maxsize=None)
def nasa7() -> dict[str, tuple[float, list[float], list[float]]]:
    """Parse thermo30.dat -> {species: (T_mid, high[7], low[7])}. He: constant cp = 5/2 R (NIST)."""
    lines = (DATA / "thermo30.dat").read_text().splitlines()
    out: dict[str, tuple[float, list[float], list[float]]] = {}
    i = 0
    while i < len(lines):
        ln = lines[i]
        if len(ln) >= 80 and ln[79] == "1":
            name = ln[:18].split()[0]
            tmid = float(ln[65:75]) if ln[65:75].strip() else 1000.0
            nums = "".join(lines[i + k][:75] for k in (1, 2, 3))
            c = [float(nums[j * 15 : (j + 1) * 15]) for j in range(14)]
            if name in SPECIES:
                out[name] = (tmid, c[:7], c[7:14])
            i += 4
        else:
            i += 1
    he = load_yaml("properties")["species"]["HE"]["nasa7_constant_cp_over_R"]
    a6 = -he * 298.15  # h(298.15 K) = 0, element reference state
    out["HE"] = (1000.0, [he, 0, 0, 0, 0, a6, 0], [he, 0, 0, 0, 0, a6, 0])
    return out


def _coef(sp: str, T: float) -> list[float]:
    tmid, hi, lo = nasa7()[sp]
    return hi if T >= tmid else lo


def cp_molar(sp: str, T: float) -> float:
    """J/mol/K (TH1)."""
    a = _coef(sp, T)
    return R * (a[0] + a[1] * T + a[2] * T**2 + a[3] * T**3 + a[4] * T**4)


def h_molar(sp: str, T: float) -> float:
    """Absolute enthalpy J/mol incl. formation (TH2)."""
    a = _coef(sp, T)
    return R * T * (a[0] + a[1] * T / 2 + a[2] * T**2 / 3 + a[3] * T**3 / 4 + a[4] * T**4 / 5 + a[5] / T)


def dh_sensible(sp: str, T1: float, T2: float) -> float:
    """Integral cp dT from T1 to T2, J/mol."""
    return h_molar(sp, T2) - h_molar(sp, T1)


@lru_cache(maxsize=None)
def molar_mass_formula(items: tuple[tuple[str, float], ...]) -> float:
    aw = load_yaml("properties")["atomic_weights"]
    return sum(aw[el] * n for el, n in items) * 1e-3  # kg/mol


def molar_mass(sp: str) -> float:
    f = load_yaml("properties")["species"][sp]["formula"]
    return molar_mass_formula(tuple(sorted(f.items())))


def fuel_molar_mass(formula: dict[str, float]) -> float:
    return molar_mass_formula(tuple(sorted(formula.items())))


def o2_per_fuel_mol(formula: dict[str, float]) -> float:
    """Stoichiometric mol O2 per mol fuel CxHyOz: x + y/4 - z/2."""
    return formula.get("C", 0) + formula.get("H", 0) / 4 - formula.get("O", 0) / 2


def stoich_s(formula: dict[str, float]) -> float:
    """Stoichiometric O2-to-fuel mass ratio s."""
    return o2_per_fuel_mol(formula) * molar_mass("O2") / fuel_molar_mass(formula)


def mix_M(x: dict[str, float]) -> float:
    return sum(xi * molar_mass(s) for s, xi in x.items())


def mole_to_mass(x: dict[str, float]) -> dict[str, float]:
    M = mix_M(x)
    return {s: xi * molar_mass(s) / M for s, xi in x.items()}


def mass_to_mole(y: dict[str, float]) -> dict[str, float]:
    inv = sum(yi / molar_mass(s) for s, yi in y.items())
    return {s: yi / molar_mass(s) / inv for s, yi in y.items()}


def cp_mass_mix(x: dict[str, float], T: float) -> float:
    """Mixture cp, J/kg/K."""
    return sum(xi * cp_molar(s, T) for s, xi in x.items()) / mix_M(x)


def density(x: dict[str, float], T: float, P: float) -> float:
    """TH5, kg/m3."""
    return P * mix_M(x) / (R * T)


def mu_air(T: float) -> float:
    c = load_yaml("properties")["transport"]["air_sutherland_mu"]
    return c["mu0"] * (T / c["T0"]) ** 1.5 * (c["T0"] + c["S"]) / (T + c["S"])


def k_air(T: float) -> float:
    c = load_yaml("properties")["transport"]["air_sutherland_k"]
    return c["k0"] * (T / c["T0"]) ** 1.5 * (c["T0"] + c["S"]) / (T + c["S"])


def k_species(sp: str, T: float) -> float:
    c = load_yaml("properties")["transport"]["k_species"][sp]
    return c["k300"] * (T / 300.0) ** c["n"]


def k_mix(x: dict[str, float], T: float) -> float:
    """TH4 mixture-averaged conductivity, W/m/K."""
    xs = {s: v for s, v in x.items() if v > 0}
    lin = sum(v * k_species(s, T) for s, v in xs.items())
    rec = sum(v / k_species(s, T) for s, v in xs.items())
    return 0.5 * (lin + 1.0 / rec)


def alpha(x: dict[str, float], T: float, P: float) -> float:
    """TH6 thermal diffusivity m2/s (note alpha ∝ 1/P)."""
    return k_mix(x, T) / (density(x, T, P) * cp_mass_mix(x, T))


def atmosphere(x_o2: float, diluent: str = "N2", x_dil: float = 0.0, base_inert: str = "N2") -> dict[str, float]:
    """O2 / base inert / added diluent mole fractions. x_dil is the diluent mole fraction of the final mix."""
    x = {"O2": x_o2, base_inert: 1.0 - x_o2 - x_dil}
    if x_dil > 0:
        x[diluent] = x.get(diluent, 0.0) + x_dil
    return x


def dilute_into(base: dict[str, float], agent: str, x_agent: float) -> dict[str, float]:
    """Disperse agent into a base atmosphere: x_i = x_i,base (1 - x_agent)."""
    out = {s: v * (1 - x_agent) for s, v in base.items()}
    out[agent] = out.get(agent, 0.0) + x_agent
    return out


def o2_bases(x: dict[str, float], P: float) -> dict[str, float]:
    """Carry O2 as x_o2, p_o2 (Pa) and y_o2."""
    return {"x_o2": x["O2"], "p_o2": x["O2"] * P, "y_o2": mole_to_mass(x)["O2"]}
