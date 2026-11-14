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
