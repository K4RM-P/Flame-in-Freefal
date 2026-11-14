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
    cols = ["id", "investigation_id", "test_label", "campaign", "fuel", "material_class", "geometry", "d0_mm", "pressure_kpa",
            "x_o2", "p_o2_kpa", "y_o2", "diluent", "x_diluent", "x_co2", "x_he", "flow_cm_s", "gravity_g", "K_mm2_s", "d_ext_mm",
            "burn_time_s", "test_end", "outcome", "cool_flame", "mode_inferred", "caption_snippet", "caption_locator",
            "source_id", "locator", "digitized", "verified", "split"]
    save_json(WEB / "test_points.json", tp[cols].to_dict(orient="records"))
    # coverage: counts of verified points per (O2 bin, P bin, g) + investigation nominal ranges
    o2_bins = [0.10, 0.15, 0.20, 0.25, 0.30, 0.35, 0.40, 0.45]
    p_bins = [40, 60, 80, 110, 320]
    cov = []
    for g in (0.0, 0.165, 0.378, 1.0):
        for i in range(len(o2_bins) - 1):
            for j in range(len(p_bins) - 1):
                sel = tp[(tp.gravity_g == g) & (tp.x_o2 >= o2_bins[i]) & (tp.x_o2 < o2_bins[i + 1]) &
                         (tp.pressure_kpa >= p_bins[j]) & (tp.pressure_kpa < p_bins[j + 1])]
                cov.append({"g": g, "o2_lo": o2_bins[i], "o2_hi": o2_bins[i + 1], "p_lo": p_bins[j], "p_hi": p_bins[j + 1],
                            "n": int(len(sel))})
    save_json(WEB / "coverage.json", {"cells": cov, "note": "verified PSI test points only (FLEX droplets); solids pending digitization"})
    print("exported", len(tp), "verified test points")


if __name__ == "__main__":
    main()
