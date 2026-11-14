"""Generate shared/golden_vectors.json: random in-envelope inputs -> Python outputs (TS must match, rtol 1e-6)."""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import numpy as np  # noqa: E402

from emberphys import droplet as D  # noqa: E402
from emberphys import gravity as G  # noqa: E402
from emberphys import habitat as H  # noqa: E402
from emberphys import smoke as SM  # noqa: E402
from emberphys import spread as SP  # noqa: E402
from emberphys import suppression as SU  # noqa: E402
from emberphys import thermo  # noqa: E402
from emberphys.flame_temp import flame_temperature  # noqa: E402
from emberphys.io import save_json  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
N = 200
rng = np.random.default_rng(7)
T = 298.15


def atm(x_o2: float, dil: str, xd: float) -> dict[str, float]:
    return thermo.atmosphere(x_o2, dil, xd)


def main() -> None:
    gv: dict[str, list] = {k: [] for k in ("thermo", "flame_temp", "droplet", "suppression", "spread", "gravity", "smoke", "habitat")}
    for _ in range(N):
        sp = str(rng.choice(thermo.SPECIES)); Tq = float(rng.uniform(250, 3400))
        x = atm(float(rng.uniform(0.1, 0.45)), str(rng.choice(["N2", "CO2", "HE"])), float(rng.uniform(0, 0.4)))
        P = float(rng.uniform(30e3, 300e3))
        gv["thermo"].append({"in": {"sp": sp, "T": Tq, "x": x, "P": P},
                             "out": {"cp": thermo.cp_molar(sp, Tq), "h": thermo.h_molar(sp, Tq), "cp_mix": thermo.cp_mass_mix(x, Tq),
                                     "k_mix": thermo.k_mix(x, Tq), "alpha": thermo.alpha(x, Tq, P), "y_o2": thermo.mole_to_mass(x)["O2"]}})
        f = str(rng.choice(["n-heptane", "methanol", "pmma", "cotton", "sibal", "n-decane"]))
        gv["flame_temp"].append({"in": {"fuel": f, "x": x}, "out": {"T_f": flame_temperature(f, x, T)}})
    for _ in range(N):
        f = str(rng.choice(["n-heptane", "methanol"]))
        x = atm(float(rng.uniform(0.15, 0.4)), str(rng.choice(["N2", "CO2", "HE"])), float(rng.uniform(0, 0.3)))
        P = float(rng.uniform(50e3, 200e3))
        p = D.DropletParams.for_fuel(f)
        st = D.state(f, x, P, T, p)
        dd, dr, gm = D.extinction_diameters(f, x, P, T, p)
        gv["droplet"].append({"in": {"fuel": f, "x": x, "P": P},
                              "out": {"K": st.K, "B": st.B, "standoff": st.standoff, "T_f0": st.T_f0, "d_diff": dd, "d_rad": dr}})
    for _ in range(N):
        f = str(rng.choice(["n-heptane", "methanol", "pmma", "cotton"]))
        xo = float(rng.uniform(0.18, 0.4)); ag = str(rng.choice(["N2", "CO2", "HE"])); tc = float(rng.uniform(1500, 2000))
        base = {"O2": xo, "N2": 1 - xo}
        gv["suppression"].append({"in": {"fuel": f, "x_o2": xo, "agent": ag, "T_crit": tc},
                                  "out": {"T_ad": SU.t_ad(f, base, T), "x_agent": SU.agent_fraction(f, base, ag, tc, T)}})
    for _ in range(N):
        m = str(rng.choice(["pmma", "cotton", "sibal"]))
        x = atm(float(rng.uniform(0.15, 0.45)), "N2", 0.0)
        P = float(rng.uniform(40e3, 110e3)); Vg = float(rng.uniform(0.005, 0.6))
        th = float(rng.uniform(1e-4, 2e-2)) if m != "sibal" else None
        r = SP.spread_rate(m, x, P, Vg, T, th)
        g = float(rng.choice([0.0, 0.165, 0.378, 1.0]))
        ub = G.buoyant_velocity(g, x, P, r["T_f"], T)
        gv["spread"].append({"in": {"material": m, "x": x, "P": P, "V_g": Vg, "thickness": th},
                             "out": {"V_f": r["V_f"], "V_thin": r["V_thin"], "V_thick": r["V_thick"], "lnDa": r["lnDa"], "T_f": r["T_f"]}})
        gv["gravity"].append({"in": {"g": g, "x": x, "P": P, "T_f": r["T_f"]}, "out": {"u_b": ub}})
        t = float(rng.uniform(1, 1800)); N0 = float(10 ** rng.uniform(10, 13)); d0 = float(rng.uniform(30e-9, 300e-9))
        gv["smoke"].append({"in": {"t": t, "N0": N0, "d0": d0, "P": P}, "out": SM.age(t, N0, d0, T, P)})
    for _ in range(12):
        inp = H.HabitatInputs(str(rng.choice(["n-heptane", "pmma", "cotton"])), float(rng.choice([0.21, 0.30, 0.34])),
                              float(rng.choice([101325.0, 70300.0, 56500.0])), float(rng.uniform(10, 200)),
                              float(rng.uniform(500, 10000)), float(rng.uniform(60, 600)), 900.0, float(rng.choice([0.0, 120.0])),
                              scrubber=bool(rng.integers(0, 2)))
        r = H.simulate(inp, 31)
        gv["habitat"].append({"in": {k: v for k, v in vars(inp).items() if v is not None},
                              "out": {k: v.tolist() for k, v in r.items()}})
    save_json(ROOT / "shared" / "golden_vectors.json", {"rtol": 1e-6, "rtol_ode": 1e-3, "T_inf": T, **gv})
    print({k: len(v) for k, v in gv.items()})


if __name__ == "__main__":
    main()
