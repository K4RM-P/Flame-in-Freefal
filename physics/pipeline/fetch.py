"""Download source PDFs into data/raw (gitignored) and record SHA-256."""
from __future__ import annotations

import hashlib
import json
import urllib.request
from pathlib import Path

RAW = Path(__file__).resolve().parents[1] / "data" / "raw"
FILES = {
    "ntrs/flex_tp_2015_216046.pdf": "https://ntrs.nasa.gov/api/citations/20150023456/downloads/20150023456.pdf",
    "ntrs/jsc20584_revC.pdf": "https://ntrs.nasa.gov/api/citations/20240007713/downloads/JSC%2020584_SMACs_Rev%20C_FINAL.pdf",
    "thermo30.dat": "http://combustion.berkeley.edu/gri-mech/version30/files30/thermo30.dat",
}


def main() -> None:
    manifest = {}
    for rel, url in FILES.items():
        p = RAW / rel
        p.parent.mkdir(parents=True, exist_ok=True)
        if not p.exists():
            urllib.request.urlretrieve(url, p)
        manifest[rel] = {"url": url, "sha256": hashlib.sha256(p.read_bytes()).hexdigest()}
    (RAW.parent / "processed" / "fetch_manifest.json").write_text(json.dumps(manifest, indent=1))
    print("fetched", len(manifest))


if __name__ == "__main__":
    main()
