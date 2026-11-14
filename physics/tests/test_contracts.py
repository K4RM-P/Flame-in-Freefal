# SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
"""§2 data contract: every emitted web/data contract file validates against shared/contracts/*.schema.json."""
import json
import subprocess
import sys
from pathlib import Path

import jsonschema
import pytest

REPO = Path(__file__).resolve().parents[2]
WEB, SCH = REPO / "web" / "data", REPO / "shared" / "contracts"
NAMES = ["test_points", "investigations", "materials", "earth_vs_orbit", "evidence_index", "boundary"]


@pytest.mark.parametrize("name", NAMES)
def test_schema_valid(name):
    schema = json.loads((SCH / f"{name}.schema.json").read_text())
    jsonschema.validate(json.loads((WEB / f"{name}.json").read_text()), schema)


def test_materials_only_real_data():
    tp = json.loads((WEB / "test_points.json").read_text())
    keys = {r["material_key"] for r in tp if r["verified"]}
    mats = json.loads((WEB / "materials.json").read_text())
    for m in mats:
        assert m["material_key"] in keys and m["n_tests"] > 0
        assert m["has_burn_data"] == any(r["material_key"] == m["material_key"] and r["outcome"] in ("burn", "extinct", "no_ignition", "insignificant") for r in tp)
    assert {"sibal", "pmma", "nomex", "silicone", "kapton", "teflon", "cotton_lamp_wick", "pyrell", "dibutyl_phthalate"} <= {m["material_key"] for m in mats}


def test_psi_rows_traceable_and_verified():
    tp = json.loads((WEB / "test_points.json").read_text())
    psi = [r for r in tp if str(r["source_id"]).startswith("PSI-")]
    assert len({r["source_id"] for r in psi}) >= 4 and len(psi) > 300
    for r in psi:
        f, n = r["locator"].split("#row")
        assert f.startswith(r["source_id"] + "_") and int(n) >= 2 and r["verified_by"] == "claude-code:auto+manual20"


def test_earth_vs_orbit_like_for_like():
    rows = json.loads((WEB / "earth_vs_orbit.json").read_text())
    meta = json.loads((REPO / "physics" / "data" / "processed" / "contract" / "earth_vs_orbit_meta.json").read_text())
    assert meta["n"] == len(rows) == sum(meta["counts"].values())
    assert all(r["source_id"] == "PSI-99" and r["material_key"] for r in rows)  # one sample, two gravity levels
    assert meta["bass_pairs"] == []


def test_contract_reread_zero_mismatches():
    v = json.loads((REPO / "physics" / "data" / "processed" / "contract" / "verification.json").read_text())
    assert v["checks"] > 1000 and v["mismatches"] == []


def test_trace_ui_numbers():
    r = subprocess.run([sys.executable, str(REPO / "physics" / "validate" / "trace_ui_numbers.py")], capture_output=True, text=True)
    assert r.returncode == 0, r.stdout[-2000:]
