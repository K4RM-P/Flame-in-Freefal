# SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
"""Grouped train/test split by test campaign (seeded). FLEX campaign = first 3 chars of CIR identifier."""
from __future__ import annotations

import numpy as np
import pandas as pd

SEED = 20261114
TEST_FRAC = 0.25


def apply(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    rng = np.random.default_rng(SEED)
    groups = sorted(df.campaign.unique())
    test = set(rng.choice(groups, size=max(1, round(TEST_FRAC * len(groups))), replace=False))
    df["split"] = np.where(df.campaign.isin(test), "test", "train")
    return df
