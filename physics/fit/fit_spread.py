# SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
"""Calibrate the opposed-flow spread model (SP1-SP5) flame-temperature factor f_T on Saffire microgravity spread rates.

Data: µg spread rates of SIBAL fabric from the Saffire flight paper (ntrs-20180005168, PDF p.30-31, Table 1), the only
spread rates available for the PSI-98/99/100 tests. The PSI-25/26 BASS/BASS-II Experimental tables carry no spread rate
or outcome column, so BASS-II cannot enter this fit (stated in params note and VALIDATION.md).
Model scope: de Ris opposed-flow spread. Only OPPOSED tests are fitted; concurrent tests are a different regime and are
reported (not fitted) so the gap is visible.
Grouped split by flight: train = Saffire-I (I-2), test = Saffire-III (III-2). mu stays None (F(Da) = 1): two points cannot
identify the Damköhler correction. One parameter, one training point: the fit is a calibration, not a validation.
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import yaml  # noqa: E402
from scipy.optimize import brentq  # noqa: E402

from emberphys import spread as SP  # noqa: E402
from emberphys.io import DATA, PARAMS, prop, save_json  # noqa: E402

T_INF = prop("constants", "T_amb")
P_FLIGHT = 100e3  # Pa; Saffire I-III ran at ~100 kPa (ntrs-20210011521 PDF p.8, Table 2 'Pressure (kPa) 100')
TRAIN, TEST = ("Saffire-I",), ("Saffire-III",)


def flight(s: str) -> str:
    return "Saffire-" + s.split("-")[0]


def predict(s: dict, f_T: float) -> float:
    x = sum(s["o2_pct"]) / len(s["o2_pct"]) / 100
    return SP.spread_rate("sibal", {"O2": x, "N2": 1 - x}, P_FLIGHT, s["flow_cm_s"] / 100, T_INF, None, SP.SpreadParams(f_T=f_T))["V_f"]


def main() -> None:
    lit = yaml.safe_load((DATA / "saffire_ntrs.yaml").read_text())["ntrs-20180005168"]
    rows = [s for s in lit["samples"] if s["material"] == "sibal" and s["ug_spread_mm_s"] is not None]
    opp = [s for s in rows if s["direction"] == "opposed"]
    train = [s for s in opp if flight(s["sample"]) in TRAIN]
    test = [s for s in opp if flight(s["sample"]) in TEST]
    s0 = train[0]
    f_T = brentq(lambda f: predict(s0, f) - s0["ug_spread_mm_s"] / 1000, 0.3, 1.5)

    def err(ss, f):
        return [{"sample": s["sample"], "obs_mm_s": s["ug_spread_mm_s"], "pred_mm_s": round(predict(s, f) * 1000, 4),
                 "rel_err": round(predict(s, f) * 1000 / s["ug_spread_mm_s"] - 1, 4), "direction": s["direction"]} for s in ss]

    te = err(test, f_T)
    conc = err([s for s in rows if s["direction"] == "concurrent"], f_T)
    loc = lit["locator_conditions"] + "; " + lit["locator_results"]
    out = {
        "model_id": "spread", "version": "0.2.0", "calibrated": True,
        "params": {"f_T": f_T, "mu": None, "b": 1.0}, "param_sd": None,
        "materials": {"sibal": {"params": {"f_T": f_T, "mu": None, "b": 1.0}}},
        "split": {"group": "flight", "train_ids": [s["sample"] for s in train], "test_ids": [s["sample"] for s in test]},
        "metrics": {"train": err(train, f_T), "test": te, "test_mape_pct": round(100 * sum(abs(e["rel_err"]) for e in te) / len(te), 1),
                    "theory_f_T_1_test": err(test, 1.0), "concurrent_not_modelled": conc},
        "sources": [{"source_id": "ntrs-20180005168", "locator": loc}, {"source_id": "PSI-98", "locator": "PSI-98_Experimental table_SAFFIRE-1.csv, line 3 (S2, opposed)"},
                    {"source_id": "PSI-100", "locator": "PSI-100_Experimental table_SAFFIRE-3.csv, line 3 (S2, opposed)"}],
        "applies_to": "sibal (thin fabric), opposed flow, ~21% O2, 100 kPa, µg. Other materials/conditions stay theory-only (f_T = 1).",
        "note": "Calibrated on ONE opposed-flow flight test (I-2), tested on ONE (III-2). BASS-II tables have no spread rates. "
                "Concurrent spread (I-1, II-5, II-6, III-1) is outside the de Ris opposed-flow model and is reported only.",
    }
    save_json(PARAMS / "spread.json", out)
    print(f"spread f_T={f_T:.4f}; test {te}; concurrent (not modelled) {conc}")


if __name__ == "__main__":
    main()
