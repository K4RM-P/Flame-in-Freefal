# SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
"""Apply sign-off records (data/verification.yaml): rows are verified only if their batch is signed off."""
from __future__ import annotations

import pandas as pd

from emberphys.io import load_yaml


def apply(df: pd.DataFrame) -> pd.DataFrame:
    rec = load_yaml("verification")
    ok_sources = {v["source_id"] for v in rec.values() if v.get("verified")}
    df = df.copy()
    df["verified"] = df.source_id.isin(ok_sources) & df.qc_flag.eq("")
    return df
