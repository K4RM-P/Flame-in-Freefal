"""Normalize extracted FLEX rows to the test_point schema (SI + x_o2, p_o2, y_o2)."""
from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

from emberphys import thermo

ROOT = Path(__file__).resolve().parents[1]
MMHG = 133.322387415  # Pa per mmHg (exact definition: 101325/760)


def normalize_flex(df: pd.DataFrame) -> pd.DataFrame:
    out = pd.DataFrame()
    out["id"] = df.test_label
    out["investigation_id"] = "FLEX"
    out["test_label"] = df.test_label
    out["campaign"] = df.cir_id.str[:3]
    out["fuel"] = df.fuel.map({"heptane": "n-heptane", "methanol": "methanol"})
    out["material_class"] = "liquid_droplet"
    out["geometry"] = "free_droplet"
    out["d0_mm"] = df.d0_mm
    out["pressure_kpa"] = df.p_mmHg * MMHG / 1000
    out["x_o2"], out["x_n2"], out["x_co2"], out["x_he"] = df.x_o2, df.x_n2, df.x_co2, df.x_he
    out["p_o2_kpa"] = out.x_o2 * out.pressure_kpa
    y = []
    for _, r in df.iterrows():
        x = {k: v for k, v in {"O2": r.x_o2, "N2": r.x_n2, "CO2": r.x_co2, "HE": r.x_he}.items() if v > 0}
        s = sum(x.values())
        y.append(thermo.mole_to_mass({k: v / s for k, v in x.items()})["O2"])
    out["y_o2"] = y
    out["diluent"] = np.select([df.x_co2 > 0, df.x_he > 0], ["CO2", "HE"], "N2")
    out["x_diluent"] = np.select([df.x_co2 > 0, df.x_he > 0], [df.x_co2, df.x_he], 0.0)
    out["flow_cm_s"] = 0.0
    out["gravity_g"] = 0.0
    out["K_mm2_s"] = df.K_mm2_s
    # d_ext = 0 in Table IX means the flame lasted until the droplet was consumed; no extinction diameter
    out["d_ext_mm"] = df.d_ext_mm.where(df.d_ext_mm > 0)
    out["burn_time_s"] = df.burn_time_s
    out["test_end"] = df.test_end
    mode = df.ext_mode_caption
    out["outcome"] = np.where(df.test_end.eq("extinction") & mode.notna(), mode,
                              np.where(df.test_end.eq("extinction"), "extinct", "burn"))
    out["cool_flame"] = df.cool_flame
    out["mode_inferred"] = df.mode_inferred
    out["caption_snippet"] = df.caption_snippet
    out["caption_locator"] = df.caption_locator
    out["source_id"] = df.source_id
    out["locator"] = df.locator
    out["digitized"] = False
    sumx = df[["x_o2", "x_n2", "x_co2", "x_he"]].sum(axis=1)
    out["qc_flag"] = np.select([df.p_mmHg < 100, (sumx - 1).abs() > 0.03], ["pressure_zero_in_source", "composition_sum"], "")
    return out
