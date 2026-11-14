# SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
"""Parse PSI Experimental tables (fetched by fetch_psi.py) into normalized, provenance-carrying rows.

Every row keeps: id, accession, source_id (= PSI accession), locator (file + row), raw (original cell strings as JSON),
qc_flag, verified=False (flipped only by the human spot-check in docs/HUMAN_TASKS.md), digitized=False.
Units: SI-friendly columns with explicit unit suffixes; x_o2 as mole fraction; flow in cm/s; thickness in mm.
Nothing is filled in by assumption: blank or ambiguous cells stay null and get a qc_flag.

Derived products (Python is the source of truth; the web only renders them):
  earth_vs_orbit.json   B3: SAFFIRE-II like-for-like µg vs 1 g burn outcomes
  bre_atmospheres.json  B4: ACME BRE O2 levels with ignited flames (pressure not given in the PSI table)
  smoke_measures.json   B5: SAME/SAME-R number, first-moment and mass measures; DAFT nuisance dust
  flex_crosscheck.json  PSI-69 FLEX table vs our NTRS Table IX extraction (independent data QA)
  coverage_psi.md       per-table row counts and gaps
"""
from __future__ import annotations

import json
import re
import sys
import warnings
from pathlib import Path

import numpy as np
import pandas as pd

warnings.filterwarnings("ignore", category=UserWarning)  # openpyxl header/footer warnings
ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw" / "psi"
OUT = ROOT / "data" / "processed" / "psi"
ATM_KPA = 101.325  # kPa per standard atmosphere (definition)
INCH_MM = 25.4  # mm per inch (definition)


# ---------------------------------------------------------------- helpers
def path(acc: str, name: str) -> Path:
    return RAW / acc / f"{acc}_{name}"


def read_csv(p: Path) -> pd.DataFrame:
    try:
        df = pd.read_csv(p, dtype=str, keep_default_na=False, encoding="utf-8-sig")
    except UnicodeDecodeError:  # some PSI tables are Windows-1252 (e.g. en dash 0x96)
        df = pd.read_csv(p, dtype=str, keep_default_na=False, encoding="cp1252")
    df.columns = [re.sub(r"\s+", " ", c).strip() for c in df.columns]
    return df


def num(s) -> float | None:
    """First number in a cell ('~ 22.1' -> 22.1, '80 W' -> 80). None for blanks/'n/a'/text."""
    if s is None or (isinstance(s, float) and np.isnan(s)):
        return None
    m = re.search(r"-?\d+(?:\.\d+)?", str(s).replace(",", ""))
    return float(m.group()) if m else None


def nums(s) -> list[float]:
    return [float(x) for x in re.findall(r"\d+(?:\.\d+)?", str(s))]


def base_rows(df: pd.DataFrame, acc: str, fname: str, table: str, line_offset: int = 2) -> list[dict]:
    return [{"id": f"{acc}:{table}:{i + line_offset}", "accession": acc, "table": table, "row_index": i,
             "source_id": acc, "locator": f"{fname}, line {i + line_offset}",
             "raw": json.dumps({k: v for k, v in r.items() if str(v).strip() not in ("", "nan")}, ensure_ascii=False),
             "qc_flag": "", "verified": False, "digitized": False} for i, (_, r) in enumerate(df.iterrows())]


def flag(row: dict, f: str) -> None:
    row["qc_flag"] = ";".join([x for x in (row["qc_flag"], f) if x])


# ---------------------------------------------------------------- BASS-II (PSI-25)
def fan_calibration() -> tuple[float, str]:
    """Parse 'U = k(AIR)' from the PSI-25 fan calibration workbook; returns (k, locator)."""
    name = "Reference Data_Fan calibration data.xlsx"
    x = pd.read_excel(path("PSI-25", name), header=None)
    for (r, c), v in x.stack().items():
        m = re.search(r"U\s*=\s*([\d.]+)\s*\(\s*AIR\s*\)", str(v))
        if m:
            note = next((str(w) for w in x.iloc[r + 1] if isinstance(w, str)), "")
            return float(m.group(1)), f"PSI-25_{name}, cell {chr(65 + c)}{r + 1} ('{v}'; {note})"
    raise ValueError("fan calibration factor not found")


def parse_sample_text(t: str) -> dict:
    s = re.sub(r"\s+", " ", t).strip()
    lo = s.lower()
    d: dict = {"material": None, "geometry": None, "thickness_mm": None, "width_cm": None, "diameter_mm": None, "colour": None}
    for key, val in (("pmma", "PMMA"), ("sibal", "SIBAL fabric"), ("nomex", "Nomex"), ("japan wax", "Japan wax"),
                     ("paraffin", "paraffin wax"), ("parrafin", "paraffin wax"), ("ultem", "Ultem"), ("wax", "wax")):
        if key in lo:
            d["material"] = val
            break
    for key, val in (("rod", "rod"), ("spher", "sphere"), ("slab", "slab"), ("film", "film"), ("candle", "candle"),
                     ("sibal", "fabric"), ("nomex", "fabric"), ("sheet", "sheet")):
        if key in lo:
            d["geometry"] = val
            break
    if "black" in lo:
        d["colour"] = "black"
    elif "clear" in lo:
        d["colour"] = "clear"
    if m := re.search(r"(\d+(?:\.\d+)?)\s*micron", lo):
        d["thickness_mm"] = float(m.group(1)) / 1000
    elif m := re.search(r"(\d+(?:\.\d+)?)\s*mm(?:\s*thick|\s*pmma film)", lo):
        d["thickness_mm"] = float(m.group(1))
    if m := re.search(r"(\d+(?:\.\d+)?)\s*cm\s*(?:wide|2ide)", lo):
        d["width_cm"] = float(m.group(1))
    elif m := re.match(r"(\d+(?:\.\d+)?)\s*cm\b", lo):  # "2 cm SIBAL", "2 cm 0.1 mm PMMA film"
        d["width_cm"] = float(m.group(1))
    if d["geometry"] == "rod" and (m := re.search(r"(\d+/\d+|\d*\.\d+|\d+)\s*\"?\"?", lo)):
        a = m.group(1)
        inch = float(a.split("/")[0]) / float(a.split("/")[1]) if "/" in a else float(a)
        d["diameter_mm"] = round(inch * INCH_MM, 4)
    if d["geometry"] == "sphere" and (m := re.search(r"(\d+(?:\.\d+)?)\s*cm", lo)):
        d["diameter_mm"] = float(m.group(1)) * 10
    return d


def bass2() -> pd.DataFrame:
    fname = "Experimental table_BASS-II.csv"
    df = read_csv(path("PSI-25", fname))
    k, k_loc = fan_calibration()
    rows = base_rows(df, "PSI-25", f"PSI-25_{fname}", "BASS-II")
    for row, (_, r) in zip(rows, df.iterrows()):
        row.update(test=r["Test #"], date=r["Date"], pi=r["PI"], sample_text=re.sub(r"\s+", " ", r["Fuel Sample Material"]).strip(),
                   **parse_sample_text(r["Fuel Sample Material"]))
        air = num(r["Air display"])
        row["air_display"] = air
        row["flow_cm_s"] = round(k * air, 6) if air is not None else None
        row["flow_source"] = f"U = {k}·(Air display) from {k_loc}" if air is not None else None
        if air is None:
            flag(row, "air_display_missing")
        for col, key in (("Calibrated initial O2 % by vol", "x_o2_initial"), ("Calibrated final O2 % by vol", "x_o2_final")):
            v = num(r[col])
            row[key] = v / 100 if v is not None else None
        for col, key in (("Initial CO2 % by vol", "x_co2_initial"), ("Final CO2 % by vol", "x_co2_final")):
            v = num(r[col])
            row[key] = v / 100 if v is not None else None
        row["co_ppm_initial"], row["co_ppm_final"] = num(r["Initial CO (ppm)"]), num(r["Final CO (ppm)"])
        row["fan_display"], row["flow_restrictor"] = num(r["Fan display"]), r["Flow restrictor"]
        row["pressure_kpa"] = None
        row["gravity_g"] = 0.0
        if row["material"] is None:
            flag(row, "material_not_named_in_cell")
    return pd.DataFrame(rows)


# ---------------------------------------------------------------- BASS (PSI-26) + As-Run matrix
def bass() -> pd.DataFrame:
    fname = "Experimental table_BASS.csv"
    df = read_csv(path("PSI-26", fname))
    mname = "Science Documents_As Run_Test Matrix.xlsx"
    x = pd.read_excel(path("PSI-26", mname), sheet_name="as run matrix", header=None)
    hdr = [re.sub(r"\s+", " ", str(h)).strip() for h in x.iloc[2]]
    asrun = {}
    for i in range(3, len(x)):
        r = dict(zip(hdr, x.iloc[i].tolist()))
        n = num(r.get("As run test no."))
        if n is not None:
            asrun[int(n)] = (i + 1, r)  # excel row number
    rows = base_rows(df, "PSI-26", f"PSI-26_{fname}", "BASS")
    for row, (_, r) in zip(rows, df.iterrows()):
        row.update(test=r["Test #"], as_run=r["As Run Test #"], date=r["Date"], sample_text=re.sub(r"\s+", " ", r["Fuel Sample Material"]).strip(),
                   **parse_sample_text(r["Fuel Sample Material"]))
        n = num(r["As Run Test #"])
        hit = asrun.get(int(n)) if n is not None else None
        row["flow_cm_s"] = None  # PSI-26 has no fan calibration; the PSI-25 file is for BASS-II hardware/days, not applied
        if not hit:
            flag(row, "no_as_run_match")
            row.update(x_o2=None, pressure_kpa=None, air_display_raw=None, observations=None, as_run_locator=None)
            continue
        excel_row, a = hit
        o2 = num(a.get("O2 % by volume"))
        row["x_o2"] = (o2 if o2 is not None and o2 < 1 else o2 / 100 if o2 is not None else None)
        if o2 is not None and o2 < 1:
            flag(row, "o2_column_holds_fraction")
        p = num(a.get("pressure, atm"))
        row["pressure_kpa"] = round(p * ATM_KPA, 4) if p is not None else None
        row["co2_mmhg"] = num(a.get("CO2, mm Hg"))
        row["air_display_raw"] = str(a.get("Air display"))
        row["observations"] = None if str(a.get("Test Observations and Anomalies", a.get(hdr[-1]))) == "nan" else str(a.get(hdr[-1]))
        row["as_run_locator"] = f"PSI-26_{mname}, sheet 'as run matrix', row {excel_row}"
        row["gravity_g"] = 0.0
    return pd.DataFrame(rows)


# ---------------------------------------------------------------- SAFFIRE-I/II/III (PSI-98/99/100)
def o2_range(s: str) -> tuple[float | None, float | None, bool]:
    v = nums(s)
    if not v:
        return None, None, False
    return min(v) / 100, max(v) / 100, "~" in str(s)


def thickness_mm(s: str) -> tuple[float | None, str]:
    t = str(s).strip().lower()
    if re.fullmatch(r"0\d+\s*mm", t):  # e.g. "037 mm": 0.37 mm or 3.7 mm? not resolvable from the table
        return None, "thickness_ambiguous_in_source"
    if " and " in t or "see" in t or not t:
        return None, "thickness_not_tabulated" if "see" in t else ("thickness_composite" if " and " in t else "thickness_missing")
    v = num(t)
    if v is None:
        return None, "thickness_missing"
    return (v * 10 if "cm" in t else v), ""


def saffire() -> pd.DataFrame:
    out = []
    for acc, fname, name in (("PSI-98", "Experimental table_SAFFIRE-1.csv", "SAFFIRE-I"), ("PSI-99", "Experimental table_SAFFIRE-2.csv", "SAFFIRE-II"),
                             ("PSI-100", "Experimental table_SAFFIRE-3.csv", "SAFFIRE-III")):
        df = read_csv(path(acc, fname))
        cols = list(df.columns)
        notes = [str(r[cols[0]]) for _, r in df.iterrows() if str(r[cols[0]]).lower().startswith("note")]
        keep = df[df[cols[0]].str.match(r"^(S\d|\d-\d)")]
        rows = base_rows(keep, acc, f"{acc}_{fname}", name)
        for row, (idx, r) in zip(rows, keep.iterrows()):
            row["locator"] = f"{acc}_{fname}, line {idx + 2}"
            g = lambda *keys: next((r[c] for c in cols for k in keys if c.lower().startswith(k.lower())), "")  # noqa: E731
            row["sample"] = r[cols[0]].strip()
            row["material"] = g("Material").strip() or None
            if not row["material"]:
                flag(row, "material_blank_in_source")
            th_raw = g("Sample Thickness", "Samle Thickness")
            row["thickness_raw"] = th_raw
            row["thickness_mm"], q = thickness_mm(th_raw if acc != "PSI-98" else f"{th_raw} cm")
            if q:
                flag(row, q)
            ln, wd = g("Sample Length"), g("Sample Width")
            row["length_cm"] = num(ln) if " and " not in ln else None
            row["length_raw"], row["width_cm"] = ln, num(wd)
            row["flow_cm_s"] = num(g("Air Flow"))
            o2raw = g("Percent O2")
            row["o2_raw"] = o2raw
            row["x_o2_lo"], row["x_o2_hi"], approx = o2_range(o2raw)
            row["x_o2"] = (row["x_o2_lo"] + row["x_o2_hi"]) / 2 if row["x_o2_lo"] is not None else None
            if approx:
                flag(row, "o2_approximate")
            if row["x_o2"] is None:
                flag(row, "o2_not_in_table")
            row["ignition_power_w"], row["ignition_time_s"] = num(g("Ignition Power")), num(g("Ignition Time"))
            bt = g("Burn Time")
            row["burn_time_s"], row["burn_time_raw"] = num(bt), bt
            row["flow_direction"] = (g("Flow Direction", "Direction").strip() or None)
            row["ug_burn_length_raw"], row["ug_spread_raw"] = g("?-g Burn", "µ-g Burn"), g("?-g Spread", "µ-g Spread")
            row["g1_burn_length_raw"], row["g1_spread_rate_raw"] = g("1-g Burn"), g("1-g Spread")
            row["gravity_g"] = 0.0
            row["notes"] = " | ".join(notes) if notes else None
            out.append(row)
    return pd.DataFrame(out)


def burn_class(raw: str, length_cm: float | None) -> str | None:
    """none | partial | full from a tabulated burn length ('~ 0', 'Complete', '29 cm', '~ 10 cm (note 3)')."""
    t = str(raw).strip().lower()
    if not t or t.startswith("n/a"):
        return None
    if t.startswith("complete"):
        return "full"
    v = num(t)
    if v is None:
        return None
    if v == 0:
        return "none"
    return "full" if length_cm is not None and abs(v - length_cm) < 1e-9 else "partial"


ORDER = {"none": 0, "partial": 1, "full": 2}


def earth_vs_orbit(saf: pd.DataFrame) -> dict:
    """B3. Like-for-like rows: same sample (material + thickness) burned in µg (flight) and in the tabulated 1 g test."""
    rows, excluded = [], []
    s2 = saf[saf.table == "SAFFIRE-II"]
    for _, r in s2.iterrows():
        comps = [r]
        mat = r.material or ""
        if "&" in mat:  # composite sample, e.g. "PMMA & Nomex" with "0.85 and 0.37 mm", "5 and 24 cm"
            names = [m.strip() for m in mat.split("&")]
            ths = [t.strip() for t in str(r.thickness_raw).replace("mm", "").split("and")]
            lns = nums(r.length_raw)
            ug = [u.strip() for u in str(r.ug_burn_length_raw).split("&")]
            comps = []
            for i, nm in enumerate(names):
                g1 = r.g1_burn_length_raw if f"({nm.lower()})" in str(r.g1_burn_length_raw).lower() else ""
                comps.append({"material": nm, "thickness_raw": f"{ths[i]} mm" if i < len(ths) else "", "length_cm": lns[i] if i < len(lns) else None,
                              "ug_burn_length_raw": ug[i] if i < len(ug) else "", "g1_burn_length_raw": g1})
        for c in comps:
            c = dict(r) | (c if isinstance(c, dict) else {})
            ugc, g1c = burn_class(c["ug_burn_length_raw"], c["length_cm"]), burn_class(c["g1_burn_length_raw"], c["length_cm"])
            base = {"sample": r["sample"], "material": c["material"], "thickness": c["thickness_raw"], "locator": r["locator"], "source_id": r["source_id"]}
            if not c["material"]:
                excluded.append(base | {"reason": "material cell blank in the PSI table (not inferred)"})
                continue
            if ugc is None or g1c is None:
                excluded.append(base | {"reason": "no tabulated 1 g result for this component" if g1c is None else "no µg burn length"})
                continue
            d = ORDER[ugc] - ORDER[g1c]
            rows.append(base | {
                "g1_burn_length": c["g1_burn_length_raw"], "g1_spread_rate": r["g1_spread_rate_raw"] if c is not None and "&" not in (r.material or "") else "n/a",
                "ug_burn_length": c["ug_burn_length_raw"], "ug_spread": r["ug_spread_raw"] if "&" not in (r.material or "") else "n/a",
                "ug_class": ugc, "g1_class": g1c, "x_o2_lo": r["x_o2_lo"], "x_o2_hi": r["x_o2_hi"], "o2_raw": r["o2_raw"],
                "flow_cm_s": r["flow_cm_s"], "flow_direction": r["flow_direction"], "length_cm": c["length_cm"],
                "agreement": "same verdict" if d == 0 else ("orbit worse" if d > 0 else "orbit better"),
            })
    n = len(rows)
    counts = {k: sum(r["agreement"] == k for r in rows) for k in ("orbit better", "same verdict", "orbit worse")}
    o2 = [v for r in rows for v in (r["x_o2_lo"], r["x_o2_hi"]) if v is not None]
    flows = sorted({r["flow_cm_s"] for r in rows})
    return {
        "rows": rows, "excluded": excluded, "n": n, "counts": counts,
        "conditions": {"x_o2_min": min(o2), "x_o2_max": max(o2), "flows_cm_s": flows, "directions": sorted({r["flow_direction"] for r in rows})},
        "classification": "burn length 'Complete' or equal to the sample length = full; '~ 0' = none; otherwise partial. "
                          "Agreement compares µg with 1 g on that ordinal scale.",
        "caveats": ["1 g test conditions (orientation, O2, flow) are not given in the PSI-99 table.",
                    "Each row is a single test (n = 1 per material and thickness).",
                    "SAFFIRE-II samples were 29 cm × 5 cm; results do not transfer to other sizes, flows or O2 levels."],
        "source_ids": ["PSI-99"],
    }


# ---------------------------------------------------------------- ACME BRE (PSI-20)
def bre() -> tuple[pd.DataFrame, dict]:
    fname = "Experimental table_ACME BRE.csv"
    df = read_csv(path("PSI-20", fname))
    rows = base_rows(df, "PSI-20", f"PSI-20_{fname}", "ACME BRE")
    notes = " ".join(n for n in df["Notes"] if n)
    for row, (_, r) in zip(rows, df.iterrows()):
        raw = r["Oxygen Conc (percent)"]
        levels = nums(raw)
        if re.fullmatch(r"\s*\d{4}%\s*", raw):  # '3400%' / '2100%': a single level with a formatting error in the table
            levels = [float(raw.strip().rstrip("%")) / 100]
            flag(row, "o2_cell_format_error_in_source")
        row.update(date=f"{r['Year']}-{r['Month']}-{r['Date']}", burner_mm=num(r["Burner Size (mm)"]), fuel=r["Fuel Bottle"].replace("%C", "% C"),
                   o2_levels_pct=levels, flames_ignited=num(r["Flames Ignited"]), pressure_kpa=None, gravity_g=0.0)
    d = pd.DataFrame(rows)
    by = {}
    for lvl in sorted({v for L in d.o2_levels_pct for v in L}):
        days = d[d.o2_levels_pct.apply(lambda L, lvl=lvl: lvl in L)]
        by[str(lvl)] = {"o2_pct": lvl, "test_days": int(len(days)), "fuels": sorted(set(days.fuel)), "burners_mm": sorted({int(b) for b in days.burner_mm}),
                        "locators": list(days.locator)}
    # Objective atmospheres, parsed from the live PSI-20 metadata text ("14.7 psia, 21 % oxygen: 10.2 psia, 26.5 %; ...").
    cat = json.loads((ROOT / "data" / "processed" / "psi_catalog.json").read_text())["investigations"]["PSI-20"]
    objective = cat["objective"] or ""
    atm = [{"psia": float(a), "o2_pct": float(b)} for a, b in re.findall(r"(\d+(?:\.\d+)?)\s*psia,\s*(\d+(?:\.\d+)?)\s*%", objective)]
    summary = {"n_days": int(len(d)), "total_flames_ignited": int(d.flames_ignited.sum()), "by_o2": by,
               "objective_atmospheres": atm, "objective_locator": "PSI API metadata, PSI-20 investigation_objective (Objective 1)",
               "objective_quote": next((ln.strip() for ln in objective.split("\n") if "psia" in ln), ""),
               "pressure_note": "The PSI-20 table states chamber pressures were varied but are not identified in the summary table.",
               "table_notes": notes, "source_ids": ["PSI-20"]}
    return d, summary


# ---------------------------------------------------------------- SAME / SAME-R / DAFT (PSI-102/101/47)
def same_r() -> pd.DataFrame:
    fname = "Experimental table_SAME-R.csv"
    df = read_csv(path("PSI-101", fname))
    rows = base_rows(df, "PSI-101", f"PSI-101_{fname}", "SAME-R")
    for row, (_, r) in zip(rows, df.iterrows()):
        row.update(material=r["Sample Type"], test=r["SAME Test #"], description=r["Description"], date=r["Date"],
                   inlet_velocity_cm_s=num(r["Inlet velocity (cm/s)"]), rt_r0=num(r["Rt/R0"]), duration_s=num(r["Duration (sec)"]),
                   primary_aging_s=num(r["Primary aging time (sec)"]), primary_mixing_s=num(r["Primary mixing time (sec)"]),
                   net_aging_s=num(r["Net aging time (sec)"]), gravity_g=0.0)
    return pd.DataFrame(rows)


def generic(acc: str, fname: str, table: str) -> pd.DataFrame:
    df = read_csv(path(acc, fname))
    return pd.DataFrame(base_rows(df, acc, f"{acc}_{fname}", table))


def smoke_measures() -> dict:
    """B5: per-test flight measures from the SAME/SAME-R 'Reduced data sheet' + DAFT nuisance-dust bag averages."""
    fname = "Analyzed Data_SAME, SAME-R_Results.xlsx"
    x = pd.read_excel(path("PSI-101", fname), sheet_name="Reduced data sheet", header=None)
    hdr = [re.sub(r"\s+", " ", str(h)).strip() for h in x.iloc[1]]
    col = {h: i for i, h in enumerate(hdr)}
    rows = []
    for i in range(2, len(x)):
        r = x.iloc[i]
        flight = str(r[col["Flight 1=same 2=sameR, g=ground"]]).strip()
        if flight not in ("1", "2") or str(r[col["Sample Type"]]) == "nan":
            continue
        f = lambda h: (None if pd.isna(r[col[h]]) or not isinstance(r[col[h]], (int, float)) else float(r[col[h]]))  # noqa: E731
        rows.append({"experiment": "SAME" if flight == "1" else "SAME-R", "material": str(r[col["Sample Type"]]).strip(),
                     "test": str(r[col["SAME #"]]).strip(), "description": str(r[col["Description"]]).strip(),
                     "inlet_velocity_cm_s": f("Inlet Velocity (cm/sec)"), "net_aging_s": f("Net Aging Duration"),
                     "m0": f("M0 best Diameter"), "m1": f("M1 (mm/cm^3)"), "mpass3": f("Mpass_3rd offset and dilution corrected"),
                     "dusttrak_b_mg_m3": f("DustTrak B calibratred and corrected for dilution (mg/m3)"),
                     "cmd_um": f("M1/M0 (micro-m)--AMD"), "dam_um": f("Diameter of Average mass (micro-m)"), "sigma_g": f("Hatch Choate Sigma g"),
                     "source_id": "PSI-101", "locator": f"PSI-101_{fname}, sheet 'Reduced data sheet', row {i + 1}"})
    dname = "Analyzed Data_DAFT Retrieved Data Summary.xls"
    d = pd.read_excel(path("PSI-47", dname), sheet_name="Logged Data Summary", header=None)
    dust = []
    for c, bag in ((1, "Bag 1"), (4, "Bag 2"), (7, "Bag 3")):
        dust.append({"sample": f"Arizona Road Dust (ARD Fine), {bag}", "ptrak_n_cm3": float(d.iloc[4, c]), "dusttrak_mg_m3": float(d.iloc[4, c + 1]),
                     "d_um_mass_number_equiv": float(d.iloc[8, c]), "source_id": "PSI-47",
                     "locator": f"PSI-47_{dname}, sheet 'Logged Data Summary', rows 5 and 9 (bag averages; source note: 'Data is from other sheet')"})
    # Per-material medians over flight tests with a recorded signal (M0 > 0), and each material's rank by each measure.
    df = pd.DataFrame(rows)
    sig = df[(df.m0.fillna(0) > 0) & df.dusttrak_b_mg_m3.notna()]
    agg = sig.groupby("material").agg(n=("test", "size"), m0=("m0", "median"), m1=("m1", "median"),
                                      dusttrak_b_mg_m3=("dusttrak_b_mg_m3", "median"), cmd_um=("cmd_um", "median"), dam_um=("dam_um", "median"))
    for c in ("m0", "m1", "dusttrak_b_mg_m3"):
        agg[f"rank_{c}"] = agg[c].rank(ascending=False, method="min").astype(int)
    no_signal = df[df.m0.fillna(0) <= 0].groupby("material").size().to_dict()
    by_material = agg.reset_index().to_dict(orient="records")
    labels = {"m0": "M0, number concentration (column 'M0 best Diameter', as tabulated)", "m1": "M1, first moment (mm/cm³) — ionization-type signal",
              "mpass3": "MPASS third moment (offset and dilution corrected; no unit in header) — mass/volume-type signal",
              "dusttrak_b_mg_m3": "DustTrak B, light-scattering mass (mg/m³, calibrated, dilution-corrected)",
              "cmd_um": "M1/M0 count-mean diameter (µm)", "dam_um": "diameter of average mass (µm)"}
    return {"rows": rows, "dust": dust, "labels": labels, "by_material": by_material, "no_signal_tests": no_signal,
            "aggregation": "median over SAME and SAME-R flight tests with M0 > 0 and a DustTrak B value; rank 1 = largest",
            "dust_note": "DAFT diameters are mass/number-equivalent diameters (diameter of average mass) computed in the source workbook "
                         "from DustTrak mass / P-Trak number with density 1.0 g/cm3; the SAME/SAME-R sheet's 'Diameter of Average mass' is the same "
                         "definition, but its assumed particle density is not stated in the sheet. Count-mean diameters (M1/M0) are a different definition.",
            "alarm_note": "The SAME/SAME-R workbook gives detector scatter voltages but no alarm thresholds or alarm states, "
                          "so no alarm result is stated.",
            "source_ids": ["PSI-101", "PSI-47"]}


# ---------------------------------------------------------------- FLEX cross-check (PSI-69 vs NTRS Table IX)
def flex_crosscheck() -> dict:
    psi = read_csv(path("PSI-69", "Experimental table_FLEX.csv"))
    ours = pd.read_csv(ROOT / "data" / "processed" / "flex_raw.csv")
    # Join on the CIR identifier (e.g. 20CAL08): PSI "FLEX Test #" numbering is offset from the TP's FLEX-nnn labels.
    # A CIR id can label two tests (193F001 = FLEX-070 and FLEX-073 in both sources): match by order of appearance.
    m, seen = {}, {}
    for _, r in psi.iterrows():
        cid = r["FLEX Identifier"].strip()
        if cid:
            seen[cid] = seen.get(cid, 0) + 1
            m[(cid, seen[cid])] = r
    occ: dict[str, int] = {}
    pairs = (("Droplet initial diameter; mm", "d0_mm"), ("Visible flame extinction diameter; mm", "d_ext_mm"),
             ("Burning rate; mm", "K_mm2_s"), ("Burn time; s", "burn_time_s"), ("Ambient pressure; mmHg", "p_mmHg"),
             ("O initial ambient composition; mole fraction", "x_o2"))
    compared, mism, unmatched = 0, [], []
    for _, o in ours.iterrows():
        cid = str(o.cir_id).strip()
        occ[cid] = occ.get(cid, 0) + 1
        p = m.get((cid, occ[cid]))
        if p is None:
            unmatched.append(o.test_label)
            continue
        for pc, oc in pairs:
            a, b = num(p[pc]), o[oc]
            if a is None or pd.isna(b):
                continue
            compared += 1
            if abs(a - float(b)) > 1e-6 + 1e-3 * abs(a):
                mism.append({"test": o.test_label, "cir_id": o.cir_id, "field": oc, "psi_69": a, "ntrs_table_ix": float(b)})
    return {"tests_in_psi": len(m), "tests_in_ntrs": int(len(ours)), "values_compared": compared, "mismatches": mism, "ntrs_tests_without_psi_match": unmatched,
            "source_ids": ["PSI-69", "ntrs-20150023456"]}


# ---------------------------------------------------------------- human spot-check list
SPOT_SEED = 20261114
HUMAN = ROOT.parent / "docs" / "HUMAN_TASKS.md"


def write_spotcheck(tables: dict[str, pd.DataFrame]) -> None:
    """20 seeded rows per normalized table for a human to compare against the PSI file (flips verified via verify)."""
    rng = np.random.default_rng(SPOT_SEED)
    head = "## PSI table spot-check (verified=false until done)"
    body = [head, "Open each file from psi.nasa.gov (or `physics/data/raw/psi/`) and compare the listed rows with "
            "`physics/data/processed/psi/<table>.csv` (normalized columns + `raw`). Record name/date per table in "
            "`physics/data/verification.yaml → psi_spotcheck`.", ""]
    picks = {}
    for k, df in tables.items():
        idx = sorted(rng.choice(len(df), size=min(20, len(df)), replace=False).tolist())
        picks[k] = [df.iloc[i]["locator"] for i in idx]
        by_file: dict[str, list[int]] = {}
        for loc in picks[k]:
            by_file.setdefault(loc.split(", ")[0], []).append(int(re.search(r"line (\d+)", loc).group(1)))
        body.append(f"- **{k}**: " + "; ".join(f"`{f}` lines {', '.join(map(str, sorted(v)))}" for f, v in sorted(by_file.items())))
    (OUT / "spotcheck.json").write_text(json.dumps(picks, indent=1))
    text = HUMAN.read_text()
    pre, _, post = text.partition(head)
    nxt = post.find("\n## ")
    rest = post[nxt:] if nxt >= 0 else ""
    HUMAN.write_text(pre.rstrip() + "\n\n" + "\n".join(body) + "\n" + rest)


# ---------------------------------------------------------------- main
def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    missing = [p for p in [path("PSI-25", "Experimental table_BASS-II.csv"), path("PSI-99", "Experimental table_SAFFIRE-2.csv")] if not p.exists()]
    if missing:
        print("PSI raw files missing; run fetch_psi.py first:", *missing, sep="\n  ", file=sys.stderr)
        return 1
    saf = saffire()
    bre_rows, bre_summary = bre()
    tables = {"bass2": bass2(), "bass": bass(), "saffire": saf, "same_r": same_r(), "bre": bre_rows,
              "same": generic("PSI-102", "Experimental table_SAME.csv", "SAME"), "daft": generic("PSI-47", "Experimental table_DAFT.csv", "DAFT"),
              "spice": generic("PSI-107", "Experimental table_Spice.csv", "SPICE")}
    sp = tables["spice"]
    raw = sp.raw.apply(json.loads)
    sp["fuel"] = raw.apply(lambda r: r.get("Fuel"))
    sp["nozzle_mm"] = raw.apply(lambda r: num(r.get("Nozzle (mm)")))
    sp["fuel_rate_mg_s"] = raw.apply(lambda r: num(r.get("Fuel Rate (mg/s)")))
    sp["air_rate_cm_s"] = raw.apply(lambda r: num(r.get("Air Rate (cm/s)")))
    for acc, fname, t in (("PSI-69", "Experimental table_FLEX.csv", "FLEX (PSI table)"), ("PSI-68", "Experimental table_Flex2.csv", "FLEX-2"),
                          ("PSI-39", "Experimental table_CFI.csv", "CFI"), ("PSI-159", "Experimental table_CFI-G_Normal Flames.csv", "CFI-G normal"),
                          ("PSI-159", "Experimental table_CFI-G_Inverse Flames.csv", "CFI-G inverse"),
                          ("PSI-10", "Experimental table_Flame Design_Normal Flame.csv", "Flame Design normal"),
                          ("PSI-10", "Experimental table_Flame Design_Inverse Flame.csv", "Flame Design inverse"),
                          ("PSI-22", "Experimental table_ACME E-FIELD Flames.csv", "ACME E-FIELD"), ("PSI-23", "Experimental table_ACME s-Flame.csv", "ACME s-Flame"),
                          ("PSI-142", "Experimental table_Data Summary Table.csv", "PSI-142 data summary")):
        if fname:
            tables[re.sub(r"\W+", "_", t.lower()).strip("_")] = generic(acc, fname, t)
    for k, df in tables.items():
        df.to_csv(OUT / f"{k}.csv", index=False)
    derived = {"earth_vs_orbit": earth_vs_orbit(saf), "bre_atmospheres": bre_summary, "smoke_measures": smoke_measures(),
               "flex_crosscheck": flex_crosscheck()}
    for k, v in derived.items():
        (OUT / f"{k}.json").write_text(json.dumps(v, indent=1, default=float, ensure_ascii=False))
    lines = ["# PSI table coverage (auto-generated by physics/pipeline/ingest_psi.py)", "",
             "All rows verified=False until the human spot-check (docs/HUMAN_TASKS.md). Normalized = parsed into typed columns.", "",
             "| table key | accession | source file | rows | normalized | rows with qc_flag |", "|---|---|---|---:|---|---:|"]
    norm = {"bass2", "bass", "saffire", "same_r", "bre", "spice"}
    for k, df in tables.items():
        files = sorted({loc.split(", ")[0] for loc in df.locator})
        lines.append(f"| {k} | {', '.join(sorted(set(df.accession)))} | {'; '.join(files)} | {len(df)} | {'yes' if k in norm else 'raw only'} | {int((df.qc_flag != '').sum())} |")
    fx = derived["flex_crosscheck"]
    lines += ["", f"Total rows: {sum(len(d) for d in tables.values())} from {len({a for d in tables.values() for a in d.accession})} accessions.",
              f"FLEX cross-check (PSI-69 vs NTRS Table IX): {fx['values_compared']} values compared, {len(fx['mismatches'])} mismatches.",
              "Gaps: PSI-21 (CLD Flame) and PSI-106 (SLICE) file search returns HTTP 500; PSI-179 (ASE) has no Experimental table; "
              "BASS/BASS-II tables carry no burn/extinction outcome or spread rate, so V6/V7 stay pending."]
    (OUT / "coverage_psi.md").write_text("\n".join(lines) + "\n")
    write_spotcheck({k: tables[k] for k in sorted(norm)})
    print("\n".join(lines[4:]))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
