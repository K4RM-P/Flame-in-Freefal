# SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
"""Parse the SAFFIRE-III Cygnus telemetry (PSI-100 'Raw Data_Raw telemetry file.csv') into SI time series.

The export is sparse: each CSV row is one telemetry packet, and channels not in that packet read 0 (or a constant sentinel
such as -7.378 V). A channel's samples are therefore the rows where that channel's packet is present (non-zero).
Conversions (header carries no units; inferred from magnitude, flagged TODO_VERIFY in docs/HUMAN_TASKS.md):
  RelativeSeconds is milliseconds: its span (9.57e6) matches the CygnusTimestamp span (1.4966e12 -> 1.49661e12 ms).
  P@PCM_ETS_TEMP_SIG is cabin air temperature in deg C (20.1-20.7): T_K = value + 273.15.
  P@F1PCM_AIR_PRES_EPS1_SIG_POS is cabin pressure in psia (13.98-14.06): P_Pa = value * 6894.757.
  Smoke-detector scatter (F2) and radiometers are kept in raw counts/units as exported.
Ignition of sample III-1 (Sample 1 igniter): the Sample1IgniterVoltage state change between two 30 s packets; the 8 s igniter
pulse falls between packets, so the ignition time carries +/- one packet interval.
Outputs: data/processed/psi/saffire3_telemetry.csv, data/processed/psi/saffire_telemetry.json (exported to web/data/psi).
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pandas as pd
import yaml

ROOT = Path(__file__).resolve().parents[1]
FILE = "PSI-100_Raw Data_Raw telemetry file.csv"
SRC = ROOT / "data" / "raw" / "psi" / "PSI-100" / FILE
OUT = ROOT / "data" / "processed" / "psi"
PSI_PA = 6894.757  # Pa per psi (definition)
C_TO_K = 273.15
WINDOW_BEFORE_S = 900.0
CH = {"T_K": "P@PCM_ETS_TEMP_SIG", "P_Pa": "P@F1PCM_AIR_PRES_EPS1_SIG_POS", "smoke_scatter_raw": "P@CDH_F2PCM_SMK_DET_SCAT_SENS_P",
      "radiometer1_raw": "P@sfsHk.Radiometer1value", "radiometer4_raw": "P@sfsHk.Radiometer4value"}


def main() -> int:
    if not SRC.exists():
        print("missing", SRC, "(run fetch_psi.py)", file=sys.stderr)
        return 1
    d = pd.read_csv(SRC)
    d["line"] = d.index + 2
    d = d[d.RelativeSeconds > -1e9].copy()  # the last row holds an overflowed timestamp (-6.36e13): not a sample
    d["t_s"] = d.RelativeSeconds / 1000.0
    d = d.sort_values("t_s")
    ig1 = d[d["P@sfsHk.Radiometer1value"] > -1000]  # housekeeping packets (radiometer sentinel -4002 otherwise)
    on = ig1[ig1["P@sfsHk.Sample1IgniterVoltage"] > -7.0]
    t_ign = float(on.t_s.iloc[0])
    prev = float(ig1[ig1.t_s < t_ign].t_s.iloc[-1])
    ig2 = ig1[ig1["P@sfsHk.Sample2IgniterCurrent"] > 0.5]
    rows = []
    for key, col in CH.items():
        s = d[d[col] != 0] if key in ("T_K", "P_Pa") else (d[d["P@CDH_F1PCM_ECLS_FAN_PRESSURE_P"] != 0] if key == "smoke_scatter_raw" else ig1)
        s = s[s.t_s >= t_ign - WINDOW_BEFORE_S]
        v = s[col] + C_TO_K if key == "T_K" else s[col] * PSI_PA if key == "P_Pa" else s[col]
        rows += [{"channel": key, "t_s": round(t - t_ign, 3), "value": float(x), "raw": float(r), "line": int(ln),
                  "source_id": "PSI-100", "locator": f"{FILE}, line {int(ln)}"} for t, x, r, ln in zip(s.t_s, v, s[col], s.line)]
    df = pd.DataFrame(rows)
    df.to_csv(OUT / "saffire3_telemetry.csv", index=False)
    lit = yaml.safe_load((ROOT / "data" / "saffire_ntrs.yaml").read_text())
    s31 = next(s for s in lit["ntrs-20180005168"]["samples"] if s["sample"] == "III-1")
    out = {
        "source_id": "PSI-100", "file": FILE, "locator_format": f"{FILE}, line N (CSV line, header = line 1)",
        "units": {"t_s": "s after III-1 ignition", "T_K": "K (from deg C, units inferred: TODO_VERIFY)",
                  "P_Pa": "Pa (from psia, units inferred: TODO_VERIFY)", "smoke_scatter_raw": "as exported (no unit in header)",
                  "radiometer1_raw": "as exported (no unit in header)", "radiometer4_raw": "as exported (no unit in header)"},
        "conversions": ["RelativeSeconds / 1000 = s (span matches CygnusTimestamp ms span)", "T_K = deg C + 273.15", "P_Pa = psia * 6894.757"],
        "t_ignition_file_s": t_ign, "t_ignition_uncertainty_s": round(t_ign - prev, 3),
        "ignition_locator": f"{FILE}, line {int(on.line.iloc[0])} (Sample1IgniterVoltage state change; previous packet line {int(ig1[ig1.t_s < t_ign].line.iloc[-1])})",
        "sample_2_ignition_s": (round(float(ig2.t_s.iloc[0]) - t_ign, 3) if len(ig2) else None),
        "sample_2_ignition_locator": (f"{FILE}, line {int(ig2.line.iloc[0])} (Sample2IgniterCurrent 0.906 A)" if len(ig2) else None),
        "replay_sample": {"sample": "III-1", "material_key": "sibal", "width_m": s31["width_cm"] / 100, "length_m": s31["length_cm"] / 100,
                          "thickness_m": s31["thickness_mm"] / 1000, "flow_m_s": s31["flow_cm_s"] / 100, "direction": s31["direction"],
                          "x_o2_start": s31["o2_pct"][0] / 100, "x_o2_end": s31["o2_pct"][-1] / 100, "burn_duration_s": s31["burn_duration_s"],
                          "ug_spread_m_s": s31["ug_spread_mm_s"] / 1000, "burned_length_raw": s31["ug_burn_length_raw"],
                          "source_id": "ntrs-20180005168", "locator": lit["ntrs-20180005168"]["locator_conditions"] + "; " + lit["ntrs-20180005168"]["locator_results"],
                          "psi_table_row": "PSI-100_Experimental table_SAFFIRE-3.csv, line 2 (states .33 cm and 30 cm/s: conflicts flagged)"},
        "vehicle_free_volume_m3": None,
        "vehicle_free_volume_note": lit["ntrs-20210011521"]["note"],
        "channels": {k: [[r.t_s, r.value, r.line] for r in g.itertuples()] for k, g in df.groupby("channel")},
        "channel_row_format": ["t_s", "value", "line"],
    }
    (OUT / "saffire_telemetry.json").write_text(json.dumps(out, indent=1))
    print(f"telemetry: ignition at file t={t_ign:.1f} s (±{t_ign - prev:.0f} s); " + ", ".join(f"{k}={len(g)}" for k, g in df.groupby("channel")))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
