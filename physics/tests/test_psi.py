# SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
"""PSI ingestion contracts (offline: reads the committed catalog / processed tables only)."""
import json
from pathlib import Path

PROC = Path(__file__).resolve().parents[1] / "data" / "processed"


def test_psi_catalog_contract():
    cat = json.loads((PROC / "psi_catalog.json").read_text())["investigations"]
    assert len(cat) == 25 and {"PSI-25", "PSI-99", "PSI-20", "PSI-101"} <= set(cat)
    for acc, c in cat.items():
        assert c["accession"] == acc and c["title"], acc
        for f in c["manifest"]:
            assert f["bytes"] < 25e6 and len(f["sha256"]) == 64 and f["url"].startswith("https://psi.nasa.gov")
            assert not f["file"].lower().endswith((".zip", ".mp4", ".mov")), f["file"]
    assert any(f["category"] == "Experimental table" for f in cat["PSI-25"]["manifest"])


def test_psi_tables_provenance_and_parsing():
    import pandas as pd

    d = PROC / "psi"
    b2 = pd.read_csv(d / "bass2.csv")
    assert len(b2) == 129 and b2.source_id.eq("PSI-25").all() and b2.locator.str.contains("BASS-II.csv, line").all()
    assert not b2.verified.any()
    r = b2[b2.test == "B1"].iloc[0]  # "100 micron PMMA film 2 cm wide", Air display 5 -> U = 1.0066*5
    assert r.material == "PMMA" and abs(r.thickness_mm - 0.1) < 1e-12 and r.width_cm == 2 and abs(r.flow_cm_s - 5.033) < 1e-9
    saf = pd.read_csv(d / "saffire.csv")
    s24 = saf[saf["sample"] == "2-4"].iloc[0]
    # "037 mm" lacks a decimal point; read as 0.37 mm per NTRS-20180005168 Table 1, and the qc flag records that reading
    assert abs(s24.thickness_mm - 0.37) < 1e-12 and "thickness_decimal_missing_in_source" in s24.qc_flag
    assert s24.thickness_raw == "037 mm"  # raw source cell kept verbatim


def test_flex_crosscheck_and_earth_vs_orbit():
    fx = json.loads((PROC / "psi" / "flex_crosscheck.json").read_text())
    assert fx["values_compared"] > 1500 and fx["mismatches"] == []
    ev = json.loads((PROC / "psi" / "earth_vs_orbit.json").read_text())
    assert ev["n"] == len(ev["rows"]) == sum(ev["counts"].values())
    assert all(r["material"] for r in ev["rows"])  # blank-material rows are excluded, never inferred
    assert {e["sample"] for e in ev["excluded"]} >= {"2-6", "2-9"}


def test_submission_hygiene():
    root = Path(__file__).resolve().parents[2]
    refs = json.loads((root / "docs" / "REFERENCES.json").read_text())
    assert len(refs["psi_records"]) == 25 and refs["nasa_resource_used"]["url"] == "https://psi.nasa.gov/physci/repo/search?q=combustion"
    assert all(lib["license"] != "UNKNOWN" for lib in refs["software"]) and refs["si_tools"] and refs["images"] == []
    dirs = ["web/app", "web/components", "web/lib", "physics/emberphys", "physics/pipeline", "physics/validate"]
    untagged = [str(p) for d in dirs for p in (root / d).rglob("*") if p.suffix in (".ts", ".tsx", ".py")
                and "__pycache__" not in p.parts and "SI-assisted" not in p.read_text()]
    assert untagged == []
