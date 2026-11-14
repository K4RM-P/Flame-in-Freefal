# SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
"""Fetch NASA PSI combustion metadata, DOIs and small tables from the public PSI API (GET only).

API (psi.nasa.gov, guide shared on Space Apps Connect #2157):
  metadata  /geode-py/ws/api/investigations/metadata
  files     /geode-py/ws/api/investigations/files/search/{ID}?page=1&size=1   (page starts at 1; size limits
            investigations, not files; results under studies -> "PSI-xx" -> study_files)
  doi       /geode-py/ws/repo/investigations/PSI-{ID}?fields=accession,doi
  download  https://psi.nasa.gov + remote_url

Rules: never download zips/videos/raw data; only "Experimental table" files plus named small reference/analyzed
spreadsheets, each checked against MAX_BYTES before download. Idempotent (cached files are reused when the size
matches; JSON responses are cache-first, `--refresh` re-pulls). Fail soft: when PSI is unreachable, the exact files are listed in docs/HUMAN_TASKS.md for a browser download.

Outputs: data/raw/psi/<accession>/<file> (gitignored), data/raw/psi/{metadata,files_<id>}.json (cache),
data/processed/psi_catalog.json (committed: live title, objective, release date, DOI, file manifest).
"""
from __future__ import annotations

import datetime as dt
import hashlib
import json
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw" / "psi"
CATALOG = ROOT / "data" / "processed" / "psi_catalog.json"
HUMAN = ROOT.parent / "docs" / "HUMAN_TASKS.md"
BASE = "https://psi.nasa.gov"
API = BASE + "/geode-py/ws"
MAX_BYTES = 25e6
TIMEOUT = 120

# Combustion accessions confirmed live on 2026-11-14 (group, short name).
ACCESSIONS = {
    26: ("solid", "BASS"), 25: ("solid", "BASS-II"), 98: ("solid", "SAFFIRE-I"), 99: ("solid", "SAFFIRE-II"),
    100: ("solid", "SAFFIRE-III"), 69: ("droplet", "FLEX"), 68: ("droplet", "FLEX-2"), 39: ("droplet", "CFI"),
    20: ("gas", "ACME BRE"), 22: ("gas", "ACME E-FIELD"), 23: ("gas", "ACME s-Flame"), 21: ("gas", "ACME CLD Flame"),
    10: ("gas", "ACME Flame Design"), 159: ("gas", "CFI-G"), 107: ("jet", "SPICE"), 106: ("jet", "SLICE"),
    102: ("smoke", "SAME"), 101: ("smoke", "SAME-R"), 47: ("smoke", "DAFT/DAFT-2"), 179: ("smoke", "ASE"),
    142: ("ground", "FLEX cool flames (counterflow)"), 117: ("ground", "FLEX cool flames (CFD)"),
    115: ("ground", "SAME smoke modeling"), 62: ("ground", "BASS flamelet modeling"), 60: ("ground", "SPICE analysis"),
}
# Extra small files the models need, beyond each "Experimental table".
EXTRA = {
    25: ["PSI-25_Reference Data_Fan calibration data.xlsx", "PSI-25_Science Documents_BASS-II_Test.Matrices.xlsx"],
    26: ["PSI-26_Science Documents_As Run_Test Matrix.xlsx"],
    47: ["PSI-47_Analyzed Data_DAFT Retrieved Data Summary.xls"],
    101: ["PSI-101_Analyzed Data_SAME, SAME-R_Results.xlsx"],
}
SKIP_EXT = (".zip", ".mp4", ".mov", ".avi", ".tif", ".tiff")


def get_json(url: str):
    with urllib.request.urlopen(urllib.request.Request(url, headers={"Accept": "application/json"}), timeout=TIMEOUT) as r:
        return json.load(r)


REFRESH = "--refresh" in sys.argv


def cached_json(name: str, url: str, offline: list[str]):
    """Cache-first (listings are large and the API rate-limits); pass --refresh to re-pull."""
    p = RAW / name
    if p.exists() and not REFRESH:
        data = json.loads(p.read_text())
        return None if "_error" in data else data
    try:
        data = get_json(url)
        p.write_text(json.dumps(data))
        return data
    except urllib.error.HTTPError as e:  # deterministic server answer (PSI returns 500 for some IDs): cache it
        offline.append(f"{url} (HTTP {e.code})")
        p.write_text(json.dumps({"_error": e.code}))
        return None
    except Exception as e:  # network down: fail soft, fall back to cache
        offline.append(f"{url} ({type(e).__name__})")
        return json.loads(p.read_text()) if p.exists() else None


def sha256(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


def main() -> int:
    RAW.mkdir(parents=True, exist_ok=True)
    offline: list[str] = []
    now = dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")
    # Keep the original fetched_at for files whose sha256 is unchanged, so reruns leave the catalog byte-identical.
    prev = json.loads(CATALOG.read_text()) if CATALOG.exists() else {"investigations": {}}
    prev_at = {(f["accession"], f["file"], f["sha256"]): f["fetched_at"] for c in prev["investigations"].values() for f in c["manifest"]}
    meta = cached_json("metadata.json", API + "/api/investigations/metadata", offline) or []
    by_acc = {m["accession"]: m for m in meta}
    catalog: dict[str, dict] = {}
    pending: list[tuple[str, str, float]] = []
    for aid, (group, short) in ACCESSIONS.items():
        acc = f"PSI-{aid}"
        m = by_acc.get(acc, {}).get("metadata", {})
        doi = cached_json(f"doi_{aid}.json", f"{API}/repo/investigations/{acc}?fields=accession,doi", offline) or {}
        files = cached_json(f"files_{aid}.json", f"{API}/api/investigations/files/search/{aid}?page=1&size=1", offline) or {}
        study = (files.get("studies") or {}).get(acc, {})
        listing = study.get("study_files", [])
        want = [f for f in listing if f["category"] == "Experimental table" or f["file_name"] in EXTRA.get(aid, [])]
        manifest = []
        for f in want:
            name, size = f["file_name"], float(f["file_size"])
            if name.lower().endswith(SKIP_EXT) or size > MAX_BYTES:
                continue
            url = BASE + f["remote_url"]
            dest = RAW / acc / name
            dest.parent.mkdir(parents=True, exist_ok=True)
            if not (dest.exists() and dest.stat().st_size == int(size)):
                try:
                    urllib.request.urlretrieve(url, dest)
                except Exception as e:
                    offline.append(f"{url} ({type(e).__name__})")
                    pending.append((acc, name, size))
                    continue
            digest = sha256(dest)
            manifest.append({"accession": acc, "file": name, "category": f["category"], "bytes": dest.stat().st_size,
                             "sha256": digest, "url": url, "fetched_at": prev_at.get((acc, name, digest), now)})
        catalog[acc] = {
            "accession": acc, "accession_id": aid, "group": group, "short_name": short,
            "title": m.get("investigation_title"), "objective": m.get("investigation_objective"),
            "public_release_date": m.get("public_release_date"), "doi": doi.get("doi"),
            "psi_url": f"https://doi.org/{doi['doi']}" if doi.get("doi") else BASE,
            "file_count": study.get("file_count", len(listing)), "files_listed": bool(listing), "manifest": manifest,
        }
    stamps = [f["fetched_at"] for c in catalog.values() for f in c["manifest"]]
    fetched_at = prev.get("fetched_at") if stamps and all(t in prev_at.values() for t in stamps) and not REFRESH else now
    CATALOG.write_text(json.dumps({"fetched_at": fetched_at, "api": API, "investigations": catalog}, indent=1, ensure_ascii=False))
    n_files = sum(len(c["manifest"]) for c in catalog.values())
    print(f"PSI catalog: {len(catalog)} accessions, {n_files} files; offline errors: {len(offline)}")
    if pending:
        write_human_tasks(pending)
    for e in offline:
        print("  unreachable:", e, file=sys.stderr)
    return 0


def write_human_tasks(pending: list[tuple[str, str, float]]) -> None:
    head = "## PSI files to download by hand (psi.nasa.gov was unreachable)"
    text = HUMAN.read_text()
    text = text.split(head)[0].rstrip() + "\n\n" + head + "\nSave each into `physics/data/raw/psi/<accession>/` with the exact file name, then rerun `make data`.\n"
    for acc, name, size in pending:
        q = urllib.parse.quote_plus(name)
        text += f"- {acc}: `{name}` ({size / 1e3:.0f} kB) — {BASE}/geode-py/ws/api/investigations/{acc}/download?source=datamanager&file={q}\n"
    HUMAN.write_text(text)


if __name__ == "__main__":
    raise SystemExit(main())
