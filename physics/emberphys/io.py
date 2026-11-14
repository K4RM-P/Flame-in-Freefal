"""ModelResult schema, YAML/param loaders and JSON export."""
from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field
from functools import lru_cache
from pathlib import Path
from typing import Any

import re

import yaml


class _Loader(yaml.SafeLoader):
    """SafeLoader that also reads YAML 1.2 floats such as 1.0e6 (PyYAML requires 1.0e+6)."""


_Loader.add_implicit_resolver(
    "tag:yaml.org,2002:float",
    re.compile(r"^[-+]?(?:[0-9][0-9_]*)\.[0-9_]*(?:[eE][-+]?[0-9]+)?$|^[-+]?[0-9][0-9_]*[eE][-+]?[0-9]+$"),
    list("-+0123456789"),
)
DATA = Path(__file__).resolve().parents[1] / "data"
PARAMS = DATA / "processed" / "params"


@dataclass
class ModelResult:
    model_id: str
    value: float
    units: str
    uncertainty: dict[str, float]
    inputs: dict[str, Any]
    equation_ids: list[str]
    assumptions: list[str]
    validity: dict[str, Any]
    sources: list[str]
    extra: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@lru_cache(maxsize=None)
def load_yaml(name: str) -> dict[str, Any]:
    with open(DATA / f"{name}.yaml") as f:
        return yaml.load(f, Loader=_Loader)


def prop(*path: str) -> float:
    """Value of a property entry, e.g. prop('fuels','n-heptane','dHc')."""
    node: Any = load_yaml("properties")
    for p in path:
        node = node[p]
    return float(node["value"]) if isinstance(node, dict) else float(node)


def fuel(name: str) -> dict[str, Any]:
    return load_yaml("properties")["fuels"][name]


def load_params(model: str) -> dict[str, Any] | None:
    p = PARAMS / f"{model}.json"
    if not p.exists():
        return None
    return json.loads(p.read_text())


def save_json(path: Path, obj: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, indent=1, default=float))
