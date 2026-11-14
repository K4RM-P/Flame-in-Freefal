# SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
"""Flammability boundary (PRD §5.7) gate: build only if the verified PSI solid outcomes can support it.

Gate (docs/DATA_AUDIT.md): >= 30 solid outcomes with numeric x_o2 AND flow, with >= 15 of them non-burn
(extinct / no_ignition / insignificant) so both sides of the boundary are observed, spanning >= 3 percentage points of O2
and >= 10 cm/s of flow. Otherwise writes {"available": false, "reason": ...} plus the observed data envelope
(lowest O2 with a sustained burn per flow bin), which is data, not a model.
Output: physics/data/processed/contract/boundary.json (exported to web/data/boundary.json).
"""
from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
CDIR = ROOT / "data" / "processed" / "contract"
SOLID = ["fabric", "plastic", "elastomer", "wax"]
NONBURN = ["extinct", "no_ignition", "insignificant"]
FLOW_BINS = [0, 2, 5, 10, 20, 30]


def main() -> int:
    d = pd.read_csv(CDIR / "psi_points.csv")
    s = d[d.verified & d.material_class.isin(SOLID) & d.outcome.isin(["burn"] + NONBURN)]
    ok = s[s.flow_cm_s.notna() & s.x_o2.notna()]
    nb = ok[ok.outcome.isin(NONBURN)]
    censored = s[s.outcome.isin(NONBURN) & s.flow_cm_s.isna()]
    span_o2 = (ok.x_o2.max() - ok.x_o2.min()) * 100 if len(ok) else 0
    span_f = ok.flow_cm_s.max() - ok.flow_cm_s.min() if len(ok) else 0
    gate = {"n_outcomes_with_o2_and_flow": int(len(ok)), "n_nonburn_with_o2_and_flow": int(len(nb)),
            "n_nonburn_flow_censored": int(len(censored)), "o2_span_pct_points": round(float(span_o2), 3), "flow_span_cm_s": round(float(span_f), 3),
            "rule": ">= 30 outcomes, >= 15 non-burn, O2 span >= 3 points, flow span >= 10 cm/s"}
    passed = len(ok) >= 30 and len(nb) >= 15 and span_o2 >= 3 and span_f >= 10
    env = []
    for cls, g in ok[ok.outcome == "burn"].groupby("material_class"):
        for lo, hi in zip(FLOW_BINS[:-1], FLOW_BINS[1:]):
            b = g[(g.flow_cm_s >= lo) & (g.flow_cm_s < hi)]
            if len(b):
                r = b.loc[b.x_o2.idxmin()]
                env.append({"material_class": cls, "flow_lo_cm_s": lo, "flow_hi_cm_s": hi, "n_burn": int(len(b)),
                            "lowest_x_o2_with_burn": float(r.x_o2), "material_key": r.material_key, "source_id": r.source_id, "locator": r.locator,
                            "pressure_kpa": None if pd.isna(r.pressure_kpa) else float(r.pressure_kpa)})
    if passed:  # pragma: no cover - not reached with the current PSI data; kept explicit so the gate is the only switch
        raise SystemExit("gate passed: implement the logistic boundary before exporting")
    out = {"available": False,
           "reason": (f"Only {len(nb)} verified non-burn solid outcomes carry a numeric flow ({len(censored)} more extinctions happened at flows "
                      "below the last tabulated reading and are censored), so the burn/extinct boundary is not observed on both sides. "
                      "No PSI solid data exist at 0.165 g or 0.378 g, and none at 56.5 or 70.3 kPa (BASS chamber 98-102 kPa; BASS-II and "
                      "SAFFIRE tables give no pressure). A p05/p50/p95 boundary on the requested grid would be extrapolation, so none is emitted."),
           "gate": gate,
           "observed_envelope": {"note": "Data, not a model: lowest initial O2 at which a verified µg test burned, per flow bin. "
                                         "Burning at lower O2 is not excluded by these data.", "rows": env},
           "grid_requested": {"x_o2": [0.12, 0.45], "flow_cm_s": [0, 60], "g": [0, 0.165, 0.378, 1], "p_kpa": [56.5, 70.3, 101.3]},
           "source_ids": sorted(set(ok.source_id)),
           "provenance": {"method": "physics/fit/fit_boundary.py gate over verified rows of processed/contract/psi_points.csv"}}
    (CDIR / "boundary.json").write_text(json.dumps(out, indent=1))
    print("boundary available:", out["available"], gate)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
