# SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
"""Validity envelope: per-feature min/max of calibration data + nearest-neighbour distance (standardized)."""
from __future__ import annotations

from typing import Any

import numpy as np


def build_envelope(rows: list[dict[str, float]], features: list[str]) -> dict[str, Any]:
    X = np.array([[r[f] for f in features] for r in rows], dtype=float)
    return {"features": features, "min": X.min(0).tolist(), "max": X.max(0).tolist(),
            "mean": X.mean(0).tolist(), "std": (X.std(0) + 1e-12).tolist(), "points": X.tolist()}


def check(env: dict[str, Any] | None, inputs: dict[str, float]) -> dict[str, Any]:
    if not env:
        return {"in_envelope": False, "nearest_data_distance": None, "note": "no calibration data (theory only)"}
    x = np.array([inputs[f] for f in env["features"]], dtype=float)
    inside = bool(np.all(x >= np.array(env["min"]) - 1e-12) and np.all(x <= np.array(env["max"]) + 1e-12))
    Z = (np.array(env["points"]) - np.array(env["mean"])) / np.array(env["std"])
    z = (x - np.array(env["mean"])) / np.array(env["std"])
    dist = float(np.min(np.linalg.norm(Z - z, axis=1)))
    return {"in_envelope": inside, "nearest_data_distance": dist}
