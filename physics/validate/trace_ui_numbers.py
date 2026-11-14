# SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
"""Fail if any number shipped in web/data lacks provenance.

A numeric leaf passes when the object holding it, or any enclosing object (up to the file root), carries either
  data provenance:  a source key (source_id | source_ids | sources | source | psi_accessions) AND a locator key
                    (locator | locators | url | doi | locator_note | files_used), or
  model provenance: equation_ids | provenance | model | method | classification | aggregation | rule | scale.
Booleans, counts named n/n_* and grid/bin edges inside an object with provenance are treated the same way (no exemptions by name).
File-level provenance can come from web/data/provenance.json ({"files": {rel_path: {"method": ...}}}).
Exit code 1 lists the first offending JSON paths per file.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

WEB = Path(__file__).resolve().parents[2] / "web" / "data"
SRC = {"source_id", "source_ids", "sources", "source", "psi_accessions", "accessions", "investigations"}
LOC = {"locator", "locators", "url", "doi", "locator_note", "files_used", "manifest", "files"}
MODEL = {"equation_ids", "provenance", "model", "method", "classification", "aggregation", "rule", "scale"}
SKIP_DIRS = {"cache"}  # cache/golden.json holds composed demo answers, traced by the web guard (lib/ai/guard.ts)


def has_prov(stack: list[dict]) -> bool:
    keys: set[str] = set()
    for d in stack:
        keys |= set(d)
        if keys & MODEL or (keys & SRC and keys & LOC):
            return True
    return False


def walk(x, stack: list[dict], path: str, bad: list[str]) -> None:
    if isinstance(x, dict):
        st = [x] + stack
        for k, v in x.items():
            walk(v, st, f"{path}.{k}", bad)
    elif isinstance(x, list):
        for i, v in enumerate(x):
            walk(v, stack, f"{path}[{i}]", bad)
    elif isinstance(x, (int, float)) and not isinstance(x, bool):
        if not has_prov(stack):
            bad.append(path)


def main() -> int:
    fails = {}
    side = json.loads((WEB / "provenance.json").read_text())["files"] if (WEB / "provenance.json").exists() else {}
    files = [p for p in sorted(WEB.rglob("*.json")) if not (set(p.relative_to(WEB).parts) & SKIP_DIRS) and p.name != "provenance.json"]
    for p in files:
        bad: list[str] = []
        rel = str(p.relative_to(WEB))
        root = [side[rel]] if rel in side else []  # file-level provenance from the sidecar (must name a method)
        walk(json.loads(p.read_text()), root, "$", bad)
        if bad:
            fails[str(p.relative_to(WEB))] = bad
    for f, b in fails.items():
        print(f"{f}: {len(b)} untraced numbers, e.g. {b[:3]}")
    print(f"trace_ui_numbers: {len(files)} files, {len(fails)} with untraced numbers")
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
