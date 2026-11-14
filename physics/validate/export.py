# SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
"""Export web JSON: data files, fitted params, verified test points, investigations, coverage."""
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import numpy as np  # noqa: E402
import pandas as pd  # noqa: E402

from emberphys import thermo  # noqa: E402
from emberphys.io import PARAMS, load_params, load_yaml, save_json  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
WEB = ROOT / "web" / "data"


def write_references(sources: dict, catalog: dict) -> None:
    """docs/REFERENCES.json: every data source (PSI-xx first), API, library, font, image and SI tool, machine-readable."""
    import re
    import tomllib

    sw = load_yaml("software")
    pkg = json.loads((ROOT / "web" / "package.json").read_text())
    py = tomllib.loads((ROOT / "physics" / "pyproject.toml").read_text())["project"]
    pins = py["dependencies"] + [d for v in py.get("optional-dependencies", {}).values() for d in v]
    libs = [{"name": n, "version": v, "ecosystem": "npm", "license": sw["licenses"].get(n, "UNKNOWN")}
            for n, v in sorted({**pkg["dependencies"], **pkg["devDependencies"]}.items())]
    for d in pins:
        n, v = re.split(r"==", d)
        libs.append({"name": n, "version": v, "ecosystem": "pypi", "license": sw["licenses"].get(n.lower(), "UNKNOWN")})
    psi = [{"id": acc, "title": c["title"], "doi": c.get("doi"), "url": c["psi_url"], "files_used": [f["file"] for f in c["manifest"]]}
           for acc, c in sorted(catalog["investigations"].items(), key=lambda kv: int(kv[0].split("-")[1]))]
    other = [{"id": k, **{f: v[f] for f in ("type", "title", "url", "year", "doi", "accessed") if v.get(f) is not None}}
             for k, v in sources.items() if not k.startswith("PSI-")]
    refs = {"project": "EmberAtlas", "license": sw["project_license"], "psi_records": psi, "other_sources": other, "apis": sw["apis"],
            "software": libs, "fonts": sw["fonts"], "images": sw["images"], "si_tools": sw["si_tools"], "si_media": sw["si_media"],
            "nasa_resource_used": sources["psi-combustion-repo"]}
    unknown = [lib["name"] for lib in libs if lib["license"] == "UNKNOWN"]
    if unknown:
        raise SystemExit(f"software.yaml is missing licenses for: {unknown}")
    (ROOT / "docs" / "REFERENCES.json").write_text(json.dumps(refs, indent=1, ensure_ascii=False) + "\n")


def contract_points() -> list[dict]:
    """Verified PSI rows from physics/pipeline/contract.py (flags back to lists, NaN -> None)."""
    p = PARAMS.parent / "contract" / "psi_points.csv"
    if not p.exists():
        return []
    df = pd.read_csv(p, dtype={"test_label": str})
    df = df[df.verified].astype(object).where(df[df.verified].notna(), None)
    rows = df.to_dict(orient="records")
    for r in rows:
        r["flags"] = [f for f in (r["flags"] or "").split(";") if f]
    return rows


# investigations.yaml key -> PSI accession ids (first = primary)
PSI_IDS = {"FLEX": [69], "FLEX-2": [68], "CFI": [39], "BASS": [26], "BASS-II": [25], "SAME": [102, 101], "Saffire-I-III": [98, 99, 100],
           "ACME-BRE": [20], "ACME-sFlame": [23], "ACME-CLD": [21], "ACME-FlameDesign": [10], "ACME-EFIT": [22], "SPICE": [107], "SLICE": [106]}
# files each pipeline stage actually reads (ingest_psi.py / contract.py)
USED = {"PSI-25": ["Experimental table_BASS-II.csv", "Reference Data_Fan calibration data.xlsx"],
        "PSI-26": ["Experimental table_BASS.csv", "Science Documents_As Run_Test Matrix.xlsx"], "PSI-98": ["Experimental table_SAFFIRE-1.csv"],
        "PSI-99": ["Experimental table_SAFFIRE-2.csv"], "PSI-100": ["Experimental table_SAFFIRE-3.csv"],
        "PSI-101": ["Experimental table_SAME-R.csv", "Analyzed Data_SAME, SAME-R_Results.xlsx"], "PSI-102": ["Experimental table_SAME.csv"],
        "PSI-47": ["Experimental table_DAFT.csv", "Analyzed Data_DAFT Retrieved Data Summary.xls"], "PSI-69": ["Experimental table_FLEX.csv"],
        "PSI-20": ["Experimental table_ACME BRE.csv"]}


def export_contract(catalog: dict, points: list[dict]) -> None:
    """§2 contract files: investigations (accession/DOI/files), materials, earth_vs_orbit, evidence_index, boundary."""
    inv = load_yaml("investigations")
    cat = catalog["investigations"]
    n_by = {}
    for r in points:
        src = "PSI-69" if r.get("investigation_id") == "FLEX" else r["source_id"]
        n_by[src] = n_by.get(src, 0) + 1
    for key, v in inv.items():
        ids = PSI_IDS.get(key, [])
        accs = []
        for i in ids:
            c = cat.get(f"PSI-{i}", {})
            files = [{"file": f["file"], "bytes": f["bytes"], "sha256": f["sha256"]} for f in c.get("manifest", [])
                     if any(f["file"].endswith(u) for u in USED.get(f"PSI-{i}", []))]
            accs.append({"accession": f"PSI-{i}", "psi_id": i, "doi": c.get("doi"), "psi_investigation_url": c.get("psi_investigation_url"),
                         "title_official": c.get("title"), "objective_official": c.get("objective"), "files_used": files,
                         "n_verified_rows": n_by.get(f"PSI-{i}", 0)})
        first = accs[0] if accs else {}
        upd = {"accession": first.get("accession"), "psi_id": first.get("psi_id"), "doi": first.get("doi"),
               "psi_investigation_url": first.get("psi_investigation_url"), "title_official": first.get("title_official"),
               "objective_official": first.get("objective_official"), "files_used": [f for a in accs for f in a["files_used"]],
               "n_verified_rows": sum(a["n_verified_rows"] for a in accs), "accessions": accs}
        v.update({k: x for k, x in upd.items() if x is not None})  # unknown -> key absent (no PSI accession, e.g. SoFIE)
        if first.get("psi_investigation_url"):
            v["psi_url"] = first["psi_investigation_url"]
    save_json(WEB / "investigations.json", inv)
    cdir = PARAMS.parent / "contract"
    for name in ("materials", "earth_vs_orbit", "evidence_index", "boundary"):
        if (cdir / f"{name}.json").exists():
            save_json(WEB / f"{name}.json", json.loads((cdir / f"{name}.json").read_text()))


PROV = {
    "coverage.json": "counts of verified rows in web/data/test_points.json (each row carries source_id + locator); built by physics/validate/export.py",
    "limits.json": "export of physics/data/limits.yaml; each limit cites a key in web/data/sources.json",
    "missions.json": "export of physics/data/missions.yaml; each mission atmosphere cites a key in web/data/sources.json",
    "properties.json": "export of physics/data/properties.yaml; each value's `source` is a key in web/data/sources.json",
    "validation_targets.json": "export of physics/data/validation_targets.yaml (published headline values with source keys)",
    "sources.json": "bibliographic metadata (year, DOI, URL) of every cited source",
    "psi_catalog.json": "PSI API responses (metadata, DOI, file search) + sha256 manifest; physics/pipeline/fetch_psi.py",
    "thermo.json": "GRI-Mech 3.0 NASA-7 polynomials parsed from physics/data/thermo30.dat by emberphys.thermo",
    "params/droplet.json": "fitted by physics/fit/fit_droplet.py on verified split=train FLEX rows",
    "params/suppression.json": "fitted by physics/fit/fit_suppression.py on verified split=train FLEX rows",
    "psi/bre_atmospheres.json": "parsed from PSI-20 Experimental table + PSI-20 API objective by physics/pipeline/ingest_psi.py",
    "psi/flex_crosscheck.json": "value-by-value comparison PSI-69 Experimental table vs NTRS Table IX (physics/pipeline/ingest_psi.py)",
}


def stamp_provenance() -> None:
    """File-level provenance in a sidecar (web/data/provenance.json) so no data file changes shape; read by trace_ui_numbers.py."""
    prov = dict(PROV)
    for f in sorted((WEB / "validation").glob("*.json")):
        prov[f"validation/{f.name}"] = "physics/validate/run_all.py: model predictions vs held-out verified rows (never fitted on them)"
    save_json(WEB / "provenance.json", {"files": {k: {"method": v} for k, v in sorted(prov.items())}})


def main() -> None:
    for name in ("properties", "missions", "limits", "validation_targets", "investigations", "verification"):
        save_json(WEB / f"{name}.json", load_yaml(name))
    # Live PSI catalog (fetch_psi.py): every PSI accession becomes a citable source "PSI-xx" (title + DOI from the API).
    sources = load_yaml("sources")
    cat_path = PARAMS.parent / "psi_catalog.json"
    catalog = json.loads(cat_path.read_text()) if cat_path.exists() else {"investigations": {}}
    for acc, c in catalog["investigations"].items():
        sources.setdefault(acc, {"type": "psi", "title": f"NASA {acc}: {c['title']}" + (f" (DOI {c['doi']})" if c.get("doi") else ""),
                                 "url": c["psi_url"], "doi": c.get("doi")})
    save_json(WEB / "sources.json", sources)
    write_references(sources, catalog)
    save_json(WEB / "psi_catalog.json", catalog)
    # PSI Experimental tables (ingest_psi.py): small derived products bundled; full tables served lazily from web/public.
    psi_dir = PARAMS.parent / "psi"
    if psi_dir.exists():
        for name in ("earth_vs_orbit", "bre_atmospheres", "smoke_measures", "flex_crosscheck", "spotcheck"):
            if (psi_dir / f"{name}.json").exists():
                save_json(WEB / "psi" / f"{name}.json", json.loads((psi_dir / f"{name}.json").read_text()))
        index = []
        pub = ROOT / "web" / "public" / "psi"
        for f in sorted(psi_dir.glob("*.csv")):
            df = pd.read_csv(f).replace({np.nan: None})
            save_json(pub / f"{f.stem}.json", df.to_dict(orient="records"))
            index.append({"key": f.stem, "rows": int(len(df)), "accessions": sorted(set(df.accession)), "columns": [c for c in df.columns if c != "raw"],
                          "qc_rows": int((df.qc_flag.fillna("") != "").sum()), "files": sorted({loc.split(", ")[0] for loc in df.locator})})
        save_json(WEB / "psi" / "tables_index.json", index)
    save_json(WEB / "thermo.json", {
        "source": "gri30 (thermo30.dat); He constant cp = 5/2 R (nist-webbook-he)",
        "nasa7": {s: {"T_mid": v[0], "high": v[1], "low": v[2]} for s, v in thermo.nasa7().items()},
        "M": {s: thermo.molar_mass(s) for s in thermo.SPECIES},
    })
    for m in ("droplet", "suppression"):
        p = load_params(m)
        if p:
            save_json(WEB / "params" / f"{m}.json", p)
    tp = pd.read_parquet(PARAMS.parent / "test_points.parquet")
    tp = tp[tp.verified].replace({np.nan: None})
    flex = tp.to_dict(orient="records")
    for r in flex:  # contract fields for FLEX droplet rows (keep every existing field)
        r.update(material_key=r["fuel"], x_o2_initial=r["x_o2"], flow_dir="quiescent", approx=False, flags=[],
                 verified_by="claude-code:visual-spotcheck+psi69-crosscheck", psi_crosscheck="PSI-69_Experimental table_FLEX.csv")
    psi = contract_points()
    allp = flex + psi
    keys = list(dict.fromkeys(k for r in allp for k in r))
    save_json(WEB / "test_points.json", [{k: r.get(k) for k in keys} for r in allp])
    export_contract(catalog, allp)
    # coverage: counts of verified points per (O2 bin, P bin, g); rows without a tabulated pressure counted separately
    o2_bins = [0.10, 0.15, 0.20, 0.25, 0.30, 0.35, 0.40, 0.45]
    p_bins = [40, 60, 80, 110, 320]
    df = pd.DataFrame(allp)
    burnish = df[df.outcome.notna()]
    cov = []
    for g in (0.0, 0.165, 0.378, 1.0):
        for i in range(len(o2_bins) - 1):
            for j in range(len(p_bins) - 1):
                sel = burnish[(burnish.gravity_g == g) & (burnish.x_o2 >= o2_bins[i]) & (burnish.x_o2 < o2_bins[i + 1]) &
                              (burnish.pressure_kpa >= p_bins[j]) & (burnish.pressure_kpa < p_bins[j + 1])]
                cov.append({"g": g, "o2_lo": o2_bins[i], "o2_hi": o2_bins[i + 1], "p_lo": p_bins[j], "p_hi": p_bins[j + 1],
                            "n": int(len(sel)), "by_class": {k: int(v) for k, v in sel.material_class.value_counts().items()}})
    nop = burnish[burnish.pressure_kpa.isna()]
    save_json(WEB / "coverage.json", {
        "cells": cov,
        "no_pressure_tabulated": {"n": int(len(nop)), "by_source": {k: int(v) for k, v in nop.source_id.value_counts().items()},
                                  "note": "BASS-II and SAFFIRE tables give no chamber pressure; these rows are counted here, not in the P bins."},
        "by_material": {k: int(v) for k, v in df.material_key.value_counts().items()},
        "note": "verified test points with a burn outcome (FLEX droplets + PSI solids); smoke/aerosol rows excluded from cells"})
    tp = df
    stamp_provenance()
    print("exported", len(tp), "verified test points")


if __name__ == "__main__":
    main()
