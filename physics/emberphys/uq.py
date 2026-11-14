"""Seeded Monte Carlo uncertainty propagation (PRD §5.10): p05/p50/p95."""
from __future__ import annotations

from typing import Any, Callable

import numpy as np

SEED = 20261114
N_DEFAULT = 1000


def sample_dist(rng: np.random.Generator, value: float, dist: dict[str, Any] | None) -> float:
    if not dist:
        return value
    if dist["type"] == "normal":
        return float(rng.normal(value, dist["sd"]))
    if dist["type"] == "uniform":
        return float(rng.uniform(dist["lo"], dist["hi"]))
    raise ValueError(dist["type"])


def percentiles(samples: list[float] | np.ndarray) -> dict[str, float]:
    a = np.asarray([s for s in samples if s is not None and np.isfinite(s)], dtype=float)
    if a.size == 0:
        return {"p05": float("nan"), "p50": float("nan"), "p95": float("nan")}
    p = np.percentile(a, [5, 50, 95])
    return {"p05": float(p[0]), "p50": float(p[1]), "p95": float(p[2])}


def monte_carlo(fn: Callable[[np.random.Generator], float | None], n: int = N_DEFAULT, seed: int = SEED) -> dict[str, float]:
    rng = np.random.default_rng(seed)
    out = []
    for _ in range(n):
        try:
            out.append(fn(rng))
        except (ValueError, ZeroDivisionError, RuntimeError):
            continue
    return percentiles(out)
