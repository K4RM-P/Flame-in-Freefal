"""Calibrate the droplet model per fuel on FLEX TRAIN rows (verified only).

Step 1: f_k (effective conductivity factor) from K: closed-form log-least-squares.
Step 2: ln C_D, ln a_eff from author-labelled extinction diameters (f_T fixed at 1: freeing it
        did not improve the train fit; tried 2026-11-14, see docs/STATUS.md):
        diffusive_ext rows -> lower root d_diff, radiative_ext rows -> upper root d_rad.
Covariance from the Gauss-Newton Jacobian (s^2 (J^T J)^-1). LOIs are NOT used here (they are V1-V4).
"""
from __future__ import annotations

import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import numpy as np
import pandas as pd
from scipy.optimize import least_squares

from emberphys import droplet as D
from emberphys.io import PARAMS, prop, save_json
from emberphys.validity import build_envelope

T_INF = prop("constants", "T_amb")
TP = PARAMS.parent / "test_points.parquet"


def atm(r: pd.Series) -> dict[str, float]:
    x = {"O2": r.x_o2, "N2": r.x_n2, "CO2": r.x_co2, "HE": r.x_he}
    x = {k: v for k, v in x.items() if v > 0}
    s = sum(x.values())
    return {k: v / s for k, v in x.items()}


def train_rows() -> pd.DataFrame:
    df = pd.read_parquet(TP)
    return df[df.verified & df.split.eq("train")]


def fit_fuel(df: pd.DataFrame, fuel: str) -> dict:
    d = df[df.fuel.eq(fuel)]
    k = d[d.K_mm2_s.notna() & (d.K_mm2_s > 0)]
    base = D.DropletParams(f_k=1.0)
    lnr = [math.log(r.K_mm2_s * 1e-6) - math.log(D.burning_rate(fuel, atm(r), r.pressure_kpa * 1e3, T_INF, base))
           for _, r in k.iterrows()]
    f_k = math.exp(float(np.mean(lnr)))
    sd_lnfk = float(np.std(lnr, ddof=1) / math.sqrt(len(lnr)))

    e = d[d.outcome.isin(["diffusive_ext", "radiative_ext"]) & d.d_ext_mm.notna()]

    def resid(theta: np.ndarray) -> np.ndarray:
        p = D.DropletParams(f_k=f_k, ln_CD=theta[0], a_eff=math.exp(theta[1]))
        out = []
        for _, r in e.iterrows():
            dd, dr, gmax = D.extinction_diameters(fuel, atm(r), r.pressure_kpa * 1e3, T_INF, p)
            pred = dd if r.outcome == "diffusive_ext" else dr
            out.append(math.log(pred * 1e3 / r.d_ext_mm) if pred else 3.0 + max(0.0, -gmax))
        return np.array(out)

    best = None
    for ln_cd0 in (12.0, 20.0, 28.0):
        for ln_a0 in (math.log(0.01), math.log(0.3), math.log(10.0)):
            r = least_squares(resid, [ln_cd0, ln_a0], diff_step=1e-3)
            if best is None or r.cost < best.cost:
                best = r
    J = best.jac
    dof = max(1, len(e) - 2)
    s2 = 2 * best.cost / dof
    cov = (s2 * np.linalg.pinv(J.T @ J)).tolist()
    ln_cd, ln_a = best.x
    return {
        "params": {"f_k": f_k, "f_T": 1.0, "ln_CD": float(ln_cd), "a_eff": math.exp(ln_a)},
        "param_sd": {"ln_f_k": sd_lnfk},
        "cov_names": ["ln_CD", "ln_a_eff"],
        "cov": cov,
        "n_K": int(len(k)), "n_ext": int(len(e)),
        "rmse_ln_dext_train": float(math.sqrt(2 * best.cost / len(e))),
        "train_ids": sorted(set(k.id) | set(e.id)),
        "envelope": build_envelope(
            [{"x_o2": r.x_o2, "pressure_kpa": r.pressure_kpa, "d0_mm": r.d0_mm} for _, r in d[d.d0_mm.notna()].iterrows()],
            ["x_o2", "pressure_kpa", "d0_mm"]),
    }


def main() -> None:
    df = train_rows()
    out = {"model_id": "droplet", "version": "0.1.0", "split": "train", "T_inf_K": T_INF,
           "source_id": "ntrs-20150023456", "fuels": {}}
    for fuel in ("n-heptane", "methanol"):
        out["fuels"][fuel] = fit_fuel(df, fuel)
        f = out["fuels"][fuel]
        print(fuel, f["params"], "n_K", f["n_K"], "n_ext", f["n_ext"], "rmse ln d", round(f["rmse_ln_dext_train"], 3))
    save_json(PARAMS / "droplet.json", out)


if __name__ == "__main__":
    main()
