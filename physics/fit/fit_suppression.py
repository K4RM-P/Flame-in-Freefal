"""Fit microgravity T_crit per fuel = T_ad at the FLEX O2/N2 LOI (V1/V2 values, Dietrich et al. 2014).

Only the O2/N2 LOIs are used; CO2- and He-diluted LOIs stay held out (V3, V4, V4b).
Uncertainty: LOI read as ±0.005 (values reported to two decimals) -> T_crit range.
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from emberphys import suppression as S  # noqa: E402
from emberphys.io import PARAMS, load_yaml, prop, save_json  # noqa: E402

T_INF = prop("constants", "T_amb")


def main() -> None:
    vt = load_yaml("validation_targets")
    out = {"model_id": "suppression", "version": "0.1.0", "T_inf_K": T_INF, "fuels": {},
           "fitted_on": ["V1", "V2"], "source_id": "dietrich-2014"}
    for vid in ("V1", "V2"):
        v = vt[vid]
        x = v["value"]
        tc = S.t_ad(v["fuel"], {"O2": x, "N2": 1 - x}, T_INF)
        lo = S.t_ad(v["fuel"], {"O2": x - 0.005, "N2": 1 - x + 0.005}, T_INF)
        hi = S.t_ad(v["fuel"], {"O2": x + 0.005, "N2": 1 - x - 0.005}, T_INF)
        out["fuels"][v["fuel"]] = {"T_crit_ug": tc, "T_crit_ug_sd": (hi - lo) / (2 * 1.96), "loi_used": x}
        print(v["fuel"], "T_crit_ug", round(tc, 1), "range", round(lo), round(hi))
    save_json(PARAMS / "suppression.json", out)


if __name__ == "__main__":
    main()
