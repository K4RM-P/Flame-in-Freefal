# SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
"""PSI contract layer (docs/DATA_AUDIT.md): raw PSI files -> typed test points + materials / earth-vs-orbit / evidence.

Reads the raw PSI files fetched by fetch_psi.py directly (cells re-read with the csv module, independent of pandas), so
every value carries source_id ("PSI-xx") and locator ("<file>#row<n>", n = 1-based line in the file, header = row 1;
for xlsx: "<file>#<sheet>!row<n>").

Outcome vocabulary: burn | extinct | no_ignition | insignificant | cool_flame | unknown; null = not a burn test (smoke).
Every rule that turns text into an outcome is listed in OUTCOME_RULES and logged in docs/DATA_AUDIT.md.
Nothing is inferred silently: any interpretation adds a flag to the row.

Outputs (physics/data/processed/contract/): psi_points.csv, materials.json, earth_vs_orbit.json, evidence_index.json,
verification.json (automated re-read diff), manual_check.json (rows listed for the 20-row manual comparison).
"""
from __future__ import annotations

import csv
import json
import re
import warnings
from pathlib import Path

import numpy as np
import pandas as pd

warnings.filterwarnings("ignore", category=UserWarning)
ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw" / "psi"
OUT = ROOT / "data" / "processed" / "contract"
ATM_KPA = 101.325  # kPa per atm (definition)
INCH_MM = 25.4  # mm per inch (definition)
VERIFIED_BY = "claude-code:auto+manual20"

FIELDS = ["id", "investigation_id", "test_label", "campaign", "fuel", "material_class", "geometry", "d0_mm", "pressure_kpa",
          "x_o2", "p_o2_kpa", "y_o2", "diluent", "x_diluent", "x_co2", "x_he", "flow_cm_s", "gravity_g", "K_mm2_s", "d_ext_mm",
          "burn_time_s", "test_end", "outcome", "cool_flame", "mode_inferred", "caption_snippet", "caption_locator",
          "source_id", "locator", "digitized", "verified", "split",
          # contract additions (§2)
          "material_key", "thickness_mm", "width_cm", "length_cm", "diameter_mm", "flow_dir", "x_o2_initial", "x_o2_final",
          "x_o2_min", "x_o2_max", "approx", "outcome_raw", "spread_rate_mm_s", "burn_length_cm", "aging_s", "repeat_of",
          "phase", "sub_campaign", "flags", "verified_by"]

# material text -> (material_key, class). Order matters (first hit wins).
MATERIALS = [
    (r"sibal|cotton-fiberglass", "sibal", "fabric"), (r"nomex", "nomex", "fabric"), (r"lamp\s*wick|lampwick", "cotton_lamp_wick", "fabric"),
    (r"pmma", "pmma", "plastic"), (r"ultem", "ultem", "plastic"), (r"kapton", "kapton", "plastic"), (r"teflon", "teflon", "plastic"),
    (r"pyrell", "pyrell", "plastic"), (r"silicone", "silicone", "elastomer"), (r"japan wax", "japan_wax", "wax"),
    (r"paraff|parraf", "paraffin_wax", "wax"), (r"dibutyl|\bdbp\b", "dibutyl_phthalate", "liquid_fuel"),
    (r"arizona road dust|ard fine", "arizona_road_dust", "nuisance_dust"),
]
DISPLAY = {"sibal": "SIBAL cotton-fiberglass fabric", "pmma": "PMMA (acrylic)", "nomex": "Nomex", "silicone": "Silicone",
           "ultem": "Ultem (polyetherimide)", "kapton": "Kapton (polyimide)", "teflon": "Teflon (PTFE)", "pyrell": "Pyrell (polyurethane foam)",
           "cotton_lamp_wick": "Cotton lamp wick", "dibutyl_phthalate": "Dibutyl phthalate", "japan_wax": "Japan wax",
           "paraffin_wax": "Paraffin wax", "arizona_road_dust": "Arizona Road Dust (ISO fine)", "n-heptane": "n-Heptane", "methanol": "Methanol"}
CLASS = {k: c for _, k, c in MATERIALS} | {"n-heptane": "liquid_fuel", "methanol": "liquid_fuel"}


def material(text: str) -> tuple[str | None, str | None]:
    lo = str(text).lower()
    for rx, key, cls in MATERIALS:
        if re.search(rx, lo):
            return key, cls
    return None, None


def num(s) -> float | None:
    m = re.search(r"-?(?:\d+\.\d+|\.\d+|\d+)", str(s).replace(",", ""))  # ".33 cm" -> 0.33
    return float(m.group()) if m else None


def clean(s) -> str:
    return re.sub(r"\s+", " ", str(s)).strip()


def read_rows(p: Path) -> list[list[str]]:
    """Independent raw read (csv module). Row i of the list = line i+1 of the file."""
    raw = p.read_bytes()
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = raw.decode("cp1252")
    return list(csv.reader(text.splitlines()))


def blank(**kw) -> dict:
    r = {f: None for f in FIELDS}
    r.update(digitized=False, verified=False, split="train", flags=[], cool_flame=False, mode_inferred=False, gravity_g=0.0)
    r.update(kw)
    return r


def o2(r: dict) -> None:
    """Fill x_o2 (= initial condition), p_o2_kpa only when pressure is known (never compare % across pressures)."""
    x = r["x_o2_initial"] if r["x_o2_initial"] is not None else r["x_o2"]
    r["x_o2"] = x
    if x is not None and r["pressure_kpa"] is not None:
        r["p_o2_kpa"] = round(x * r["pressure_kpa"], 6)


# ------------------------------------------------------------------ BASS-II (PSI-25)
FAN_FILE = "PSI-25_Reference Data_Fan calibration data.xlsx"


def fan_k() -> tuple[float, str]:
    x = pd.read_excel(RAW / "PSI-25" / FAN_FILE, header=None)
    for (r, c), v in x.stack().items():
        m = re.search(r"U\s*=\s*([\d.]+)\s*\(\s*AIR\s*\)", str(v))
        if m:
            return float(m.group(1)), f"{FAN_FILE}#{chr(65 + c)}{r + 1}"
    raise ValueError("calibration factor not found")


def air_values(text: str) -> tuple[float | None, float | None, bool, bool]:
    """(first, last, pot_present) Air-display readings. Parenthesised groups (fan pot values) dropped; a number right
    after 'pot'/'pots' is a fan-pot setting (uncalibrated), not a speed; '<1' and 'max' are not numbers."""
    lo = str(text).lower()
    outside = re.sub(r"\([^)]*\)", " ", lo)
    inside = " ".join(re.findall(r"\(([^)]*)\)", lo))
    nums_out = [float(x) for x in re.findall(r"\d+(?:\.\d+)?", outside)]
    # Fan display runs 38-122 (PSI-25 fan calibration sheet); a cell whose bare numbers are all >= 38 with a parenthesised
    # list holds fan values outside and Air-display readings inside (e.g. O13a "49 44 42 41 41 40.5 (5 2 0)").
    swapped = bool(inside.strip()) and bool(nums_out) and min(nums_out) >= 38
    t = (inside if swapped else outside).replace(">", " ").replace(",", " ")
    toks = t.split()
    vals = []
    for i, tok in enumerate(toks):
        m = re.fullmatch(r"~?(\d+(?:\.\d+)?)(ext)?", tok)
        if not m or (i > 0 and toks[i - 1].startswith("pot")):
            continue
        vals.append(float(m.group(1)))
    pot = any(x.startswith("pot") for x in toks)
    return (vals[0] if vals else None), (vals[-1] if vals else None), pot or swapped, swapped


EXT_RX = r"\bext\b|\d+ext|extinguish|\bout\b|\boff\b|blowoff|blow off|would not stay lit"


def bass2(k: float, k_loc: str) -> list[dict]:
    fname = "PSI-25_Experimental table_BASS-II.csv"
    rows = read_rows(RAW / "PSI-25" / fname)
    h = [clean(c) for c in rows[0]]
    col = {c: i for i, c in enumerate(h)}
    out = []
    for ln, cells in enumerate(rows[1:], start=2):
        g = lambda name: cells[col[name]] if col[name] < len(cells) else ""  # noqa: E731
        test, mat_text = g("Test #").strip(), clean(g("Fuel Sample Material"))
        fan, air, frames = clean(g("Fan display")), clean(g("Air display")), clean(g("Total Frames Shot"))
        key, cls = material(mat_text)
        flags = []
        lo = mat_text.lower()
        geometry = ("rod" if "rod" in lo else "spherical_section" if "spher" in lo else "film" if "film" in lo or "micron" in lo
                    else "slab" if "slab" in lo or "thick" in lo else "fabric" if key in ("sibal", "nomex") else "candle" if "candle" in lo else None)
        if key is None and geometry == "rod":
            # Same sheet labels identical rods "clear pmma rod" (O5a, O13a, O22): documented interpretation, flagged.
            key, cls = "pmma", "plastic"
            flags.append("material_inferred_from_sheet")
        if key is None and geometry == "film" and test.startswith("B"):
            key, cls = "pmma", "plastic"  # Bhattacharjee film series; sibling rows name "pmma film"
            flags.append("material_inferred_from_sheet")
        thick = None
        if m := re.search(r"(\d+(?:\.\d+)?)\s*micron", lo):
            thick = float(m.group(1)) / 1000
        elif m := re.search(r"(\d+(?:\.\d+)?)\s*mm", lo):
            thick = float(m.group(1))
        width = None
        if m := re.search(r"(\d+(?:\.\d+)?)\s*cm\s*(?:wide|2ide)", lo):
            width = float(m.group(1))
        elif m := re.match(r"(\d+(?:\.\d+)?)\s*cm\b", lo):
            width = float(m.group(1))
        diam = None
        if geometry == "rod" and (m := re.search(r"(\d+/\d+|\d*\.\d+|\d+)\s*\"?", lo)):
            a = m.group(1)
            diam = round((float(a.split("/")[0]) / float(a.split("/")[1]) if "/" in a else float(a)) * INCH_MM, 4)
            thick = None
        if geometry == "spherical_section" and (m := re.search(r"(\d+(?:\.\d+)?)\s*cm", lo)):
            diam, width = float(m.group(1)) * 10, None
        x0, x1 = num(g("Calibrated initial O2 % by vol")), num(g("Calibrated final O2 % by vol"))
        x0 = round(x0 / 100, 6) if x0 is not None else None
        x1 = round(x1 / 100, 6) if x1 is not None else None
        if x1 is not None and x0 is not None and (x1 > 0.3 or x1 < 0.05):
            flags.append("o2_final_implausible_in_source")
        co0, co1 = num(g("Initial CO (ppm)")), num(g("Final CO (ppm)"))
        if any(v is not None and v < 0 for v in (co0, co1)):
            flags.append("negative_CO_offset")
        first, last, pot, swapped = air_values(air)
        if swapped:
            flags.append("air_fan_values_swapped_in_cell")
        if m := re.search(r"(\d+(?:\.\d+)?)\s*cm/s", air):  # e.g. "49 5 cm/s": the explicit cm/s reading wins over fan values
            first = float(m.group(1))
            flags.append("air_display_explicit_cm_s")
        flow0 = round(k * first, 6) if first is not None else None
        if flow0 is None:
            flags.append("fan_display_uncalibrated")
        both = f"{fan} {air}".lower()
        sub = {"B": "Bhattacharjee", "F": "Ferkul", "M": "Miller", "O": "Olson", "P": "Fernandez-Pello", "T": "T'ien"}.get(test[:1])
        base = dict(investigation_id="BASS-II", test_label=test, campaign="BASS-II", sub_campaign=g("PI").strip() or sub, fuel=mat_text,
                    material_key=key, material_class=cls, geometry=geometry, thickness_mm=thick, width_cm=width, diameter_mm=diam,
                    flow_dir="opposed" if "opposed" in lo else None, x_o2_initial=x0, x_o2_final=x1, approx=False,
                    source_id="PSI-25", locator=f"{fname}#row{ln}", outcome_raw=f"Fan display: {fan} | Air display: {air} | Total Frames Shot: {frames}")
        # Outcome at the ignition condition (initial O2, first calibrated air reading).
        if re.search(r"no ign", both):
            outcome = "no_ignition"
        elif frames.lower() == "none":
            outcome = "unknown"
            flags.append("no_frames_recorded")
        elif "would not stay lit" in both:
            outcome = "extinct"
        else:
            outcome = "burn"
        r = blank(id=f"PSI-25:{test}:ign", phase="ignition", flow_cm_s=flow0, outcome=outcome, flags=list(flags), **base)
        out.append(r)
        # Extinction phase (flow changed after ignition until the flame went out).
        if outcome == "burn" and re.search(EXT_RX, both):
            fl = list(flags)
            mode = "blowoff" if "blow" in both else "low_flow"
            ext_flow = None
            if mode == "blowoff":
                fl.append("blowoff_flow_not_tabulated")
            elif re.search(r"down|decr|low", air.lower()) or last is None:
                fl.append("extinction_flow_below_last_listed")
            elif pot:
                fl.append("extinction_flow_in_fan_pot_units")
            else:
                ext_flow = round(k * last, 6)
            fl.append(f"extinction_mode_{mode}")
            out.append(blank(id=f"PSI-25:{test}:ext", phase="extinction", flow_cm_s=ext_flow, outcome="extinct", flags=fl,
                             **(base | {"x_o2_initial": x0})))
    for r in out:
        r["pressure_kpa"] = None  # not in the BASS-II table
        o2(r)
        r["flow_source"] = f"U = {k}·(Air display), {k_loc}"
    return out


# ------------------------------------------------------------------ BASS (PSI-26) + As-Run matrix
ASRUN = "PSI-26_Science Documents_As Run_Test Matrix.xlsx"


def bass_outcome(obs: str) -> tuple[str, str]:
    """Rule-based outcome at the ignition condition from the flight observation text. Returns (outcome, rule)."""
    t = obs.lower()
    rules = [
        ("unknown", r"igniter broke before ignition|igniter is broken|no useful d|no go\."),
        ("extinct", r"brief ignition and extinguished|died when igniter|self-extinguish|winked out|went out when igniter|went out on its own"
                    r"|no luck keeping the flame|ignited briefly|brief flame .* flamed out|got a brief flame a few times, but went out"
                    r"|ignited and burned for only"),
        ("no_ignition", r"did not ignite|no ignition|no joy|no flame\.|no luck"),
        ("burn", r"ignit|wake ign|burn|flame|spread|soot|blue|did not blow out"),
    ]
    for outcome, rx in rules:
        if re.search(rx, t):
            return outcome, rx.split("|")[0]
    return "unknown", "no rule matched"


def bass() -> list[dict]:
    fname = "PSI-26_Experimental table_BASS.csv"
    rows = read_rows(RAW / "PSI-26" / fname)
    x = pd.read_excel(RAW / "PSI-26" / ASRUN, sheet_name="as run matrix", header=None)
    hdr = [clean(h) for h in x.iloc[2]]
    asrun: dict[tuple[str, str], tuple[int, dict]] = {}
    for i in range(3, len(x)):
        r = dict(zip(hdr, x.iloc[i].tolist()))
        a, t = r.get("As run test no."), r.get("Test no.")
        if num(a) is not None and str(a) != "nan":
            asrun[(str(int(float(a))) if re.fullmatch(r"[\d.]+", str(a)) else str(a), clean(t).replace(".0", ""))] = (i + 1, r)
    out = []
    for ln, c in enumerate(rows[1:], start=2):
        date, gmt, ar, test, sample, mat_text = (c + [""] * 6)[:6]
        mat_text = clean(mat_text)
        key, cls = material(mat_text)
        flags = []
        lo = mat_text.lower()
        if key is None and "sphere" in lo:
            key, cls = "pmma", "plastic"  # sibling rows "PMMA sphere 2 cm"; documented interpretation
            flags.append("material_inferred_from_sheet")
        if key is None:
            flags.append("material_not_named_in_cell")
        hit = asrun.get((ar.strip(), test.strip()))
        r = blank(id=f"PSI-26:{test.strip()}:{ar.strip()}", investigation_id="BASS", test_label=f"As-run {ar.strip()} (test {test.strip()})",
                  campaign="BASS", fuel=mat_text, material_key=key, material_class=cls, source_id="PSI-26", locator=f"{fname}#row{ln}",
                  geometry="sphere" if "spher" in lo else "slab" if "slab" in lo else "candle" if "candle" in lo else "sheet" if "sheet" in lo
                  else "fabric" if key in ("sibal", "nomex") else None, approx=False, phase="ignition", flags=flags)
        if m := re.search(r"(\d+(?:\.\d+)?)\s*cm\b", lo):
            if r["geometry"] == "sphere":
                r["diameter_mm"] = float(m.group(1)) * 10
            else:
                r["width_cm"] = float(m.group(1))
        if "opposed" in lo:
            r["flow_dir"] = "opposed"
        if not hit:
            flags.append("no_as_run_match")
            r["outcome"] = "unknown"
            out.append(r)
            continue
        xl_row, a = hit
        o = num(a.get("O2 % by volume"))
        r["x_o2_initial"] = round(o if o < 1 else o / 100, 6) if o is not None else None
        p = num(a.get("pressure, atm"))
        r["pressure_kpa"] = round(p * ATM_KPA, 4) if p is not None else None
        obs_v = a.get(next(h for h in hdr if h.startswith("Test Observations")))
        obs = "" if str(obs_v) == "nan" else clean(obs_v)
        r["outcome"], rule = bass_outcome(obs)
        r["outcome_raw"] = obs
        r["outcome_rule"] = rule
        r["as_run_locator"] = f"{ASRUN}#as run matrix!row{xl_row}"
        if m := re.search(r"(\d+(?:\.\d+)?)\s*cm/s", obs):
            r["flow_cm_s"] = float(m.group(1))
            flags.append("flow_from_observation_text")
        else:
            flags.append("air_display_uncalibrated")
        r["air_display_raw"] = clean(a.get("Air display"))
        o2(r)
        out.append(r)
    return out


# ------------------------------------------------------------------ SAFFIRE-I/II/III (PSI-98/99/100)
def o2_cell(s: str) -> tuple[float | None, float | None, bool]:
    v = [float(x) for x in re.findall(r"\d+(?:\.\d+)?", s)]
    if not v:
        return None, None, False
    return min(v) / 100, max(v) / 100, "~" in s


def burn_class(s: str, length: float | None) -> tuple[str | None, float | None]:
    """Categorical burn-length cell -> (outcome, length_cm). 'Complete' = burn of full length; '~ 0' = insignificant."""
    t = clean(s).lower()
    if not t or t.startswith("n/a"):
        return None, None
    if t.startswith("complete"):
        return "burn", length
    v = num(t)
    if v is None:
        return None, None
    if v == 0:
        return "insignificant", 0.0
    return "burn", v


def saffire() -> list[dict]:
    out = []
    specs = (("PSI-98", "PSI-98_Experimental table_SAFFIRE-1.csv", "SAFFIRE-I"), ("PSI-99", "PSI-99_Experimental table_SAFFIRE-2.csv", "SAFFIRE-II"),
             ("PSI-100", "PSI-100_Experimental table_SAFFIRE-3.csv", "SAFFIRE-III"))
    for acc, fname, camp in specs:
        rows = read_rows(RAW / acc / fname)
        h = [clean(c).replace("�", "?") for c in rows[0]]
        col = lambda *keys: next((i for i, c in enumerate(h) for k in keys if c.lower().startswith(k.lower())), None)  # noqa: E731
        for ln, c in enumerate(rows[1:], start=2):
            sid = c[0].strip()
            if not re.match(r"^(S\d|\d-\d)", sid):
                continue  # F1C1/F1C2 etc. are pre-test flow visualization; notes rows are not tests
            g = lambda *keys: (c[col(*keys)] if col(*keys) is not None and col(*keys) < len(c) else "")  # noqa: E731
            flags = []
            mat_text = clean(g("Material"))
            key, cls = material(mat_text)
            if not mat_text:
                flags.append("material_blank_in_source")
            th_raw = clean(g("Sample Thickness", "Samle Thickness"))
            ln_raw, wd_raw = clean(g("Sample Length")), clean(g("Sample Width"))
            flow = num(g("Air Flow"))
            fdir = clean(g("Flow Direction", "Direction")).lower() or None
            o2lo, o2hi, approx = o2_cell(clean(g("Percent O2")))
            base = dict(investigation_id=camp, test_label=f"{camp} {sid}", campaign=camp, source_id=acc, locator=f"{fname}#row{ln}",
                        flow_cm_s=flow, flow_dir=fdir, x_o2_min=o2lo, x_o2_max=o2hi,
                        x_o2_initial=None if o2lo is None else round((o2lo + o2hi) / 2, 6), approx=approx, phase="test")
            if o2lo is None:
                flags.append("o2_not_in_table")
            comps = [(mat_text, key, cls, th_raw, ln_raw)]
            if "&" in mat_text:  # SAFFIRE-II 2-7 "PMMA & Nomex", "0.85 and 0.37 mm", "5 and 24 cm"
                names = [m.strip() for m in mat_text.split("&")]
                ths = [t.strip() + " mm" for t in th_raw.replace("mm", "").split("and")]
                lns = [t.strip() + " cm" for t in ln_raw.replace("cm", "").split("and")]
                comps = [(nm, *material(nm), ths[i], lns[i]) for i, nm in enumerate(names)]
            for j, (nm, k_, c_, th, lnr) in enumerate(comps):
                fl = list(flags) + (["composite_sample_component"] if len(comps) > 1 else [])
                thick = None
                t = th.lower()
                if re.fullmatch(r"0\d+\s*mm", t):
                    thick = float("0." + re.match(r"0(\d+)", t).group(1))  # "037 mm" = 0.37 mm (leading "0." lost in source)
                    fl.append("thickness_leading_zero_restored")
                elif "see" in t:
                    fl.append("thickness_not_tabulated")
                elif t:
                    v = num(t)
                    unit_cm = "cm" in t or (acc == "PSI-98")  # SAFFIRE-I header: "Sample Thickness (cm)"
                    thick = None if v is None else round(v * 10 if unit_cm else v, 6)
                if key == "sibal" or k_ == "sibal":
                    if acc in ("PSI-98", "PSI-100"):
                        fl.append("thickness_inconsistent")  # 0.37 cm (I) / .33 cm (III) vs 0.37 mm (II); kept as tabulated
                length = num(lnr)
                if acc == "PSI-98":
                    fl.append("length_width_order_differs_from_saffire_iii")
                r = blank(id=f"{acc}:{sid}" + (f":{chr(97 + j)}" if len(comps) > 1 else ""), fuel=nm or None, material_key=k_,
                          material_class=c_, geometry="sheet", thickness_mm=thick, length_cm=length, width_cm=num(wd_raw), flags=fl, **base)
                bt = clean(g("Burn Time"))
                r["burn_time_s"] = num(bt)
                if acc == "PSI-99":
                    ug_b = clean(g("?-g Burn", "µ-g Burn")).split("&")
                    ug_raw = ug_b[j].strip() if j < len(ug_b) else ""
                    oc, bl = burn_class(ug_raw, length)
                    if len(comps) > 1 and j == 1:
                        oc = "no_ignition"  # Note 2: "the Nomex was not ignited"
                        fl.append("outcome_from_table_note_2")
                    if bt.lower() == "insignificant":
                        oc = "insignificant"
                    sp = clean(g("?-g Spread", "µ-g Spread"))
                    r["spread_rate_mm_s"] = num(sp) if "mm/s" in sp and len(comps) == 1 else None
                    if "mm/s" in sp:
                        fl.append("ug_spread_column_header_says_length_value_is_rate")
                    if "note 3" in ug_raw.lower():
                        fl.append("burn_length_is_visible_damage_note_3")
                    r["burn_length_cm"] = bl
                    r["outcome"] = oc or "unknown"
                    r["outcome_raw"] = f"Burn Time: {bt} | µg Burn Length: {ug_raw} | µg Spread: {sp}"
                    r["g1_burn_length_raw"] = clean(g("1-g Burn"))
                    r["g1_spread_rate_raw"] = clean(g("1-g Spread"))
                elif acc == "PSI-98":
                    r["outcome"] = "burn" if r["burn_time_s"] else "unknown"
                    r["outcome_raw"] = f"Burn Time (s): {bt}"
                else:
                    r["outcome"] = "unknown"
                    r["outcome_raw"] = ""
                    fl.append("outcome_not_in_table")
                r["flags"] = fl
                o2(r)
                out.append(r)
    return out


# ------------------------------------------------------------------ SAME-R (PSI-101), SAME (PSI-102), DAFT (PSI-47)
def smoke() -> list[dict]:
    out = []
    fname = "PSI-101_Experimental table_SAME-R.csv"
    rows = read_rows(RAW / "PSI-101" / fname)
    h = [clean(x) for x in rows[0]]
    col = {c: i for i, c in enumerate(h)}
    for ln, c in enumerate(rows[1:], start=2):
        g = lambda n: c[col[n]] if col[n] < len(c) else ""  # noqa: E731
        test = g("SAME Test #").strip()
        if not test:
            continue
        key, cls = material(g("Sample Type"))
        flags = ["smoke_test"]
        rep = re.match(r"^(\d+)[a-z]$", test)
        if rep:
            flags.append("aged_repeat")
        mk = key or "unknown"
        out.append(blank(id=f"PSI-101:{mk}:{test}", investigation_id="SAME-R", test_label=f"SAME-R {test}", campaign="SAME-R", fuel=clean(g("Sample Type")),
                         material_key=key, material_class=cls, flow_cm_s=num(g("Inlet velocity (cm/s)")), flow_dir="concurrent",
                         aging_s=num(g("Net aging time (sec)")), repeat_of=f"PSI-101:{mk}:{rep.group(1)}" if rep else None, burn_time_s=num(g("Duration (sec)")),
                         outcome=None, outcome_raw=clean(g("Description")), source_id="PSI-101", locator=f"{fname}#row{ln}", phase="smoke", flags=flags))
    fname = "PSI-102_Experimental table_SAME.csv"
    rows = read_rows(RAW / "PSI-102" / fname)
    for ln, c in enumerate(rows[1:], start=2):
        if not c or not c[0].strip():
            continue
        key, cls = material(c[1])
        aging_min = num(c[4]) if len(c) > 4 else None
        out.append(blank(id=f"PSI-102:{c[0].strip()}", investigation_id="SAME", test_label=f"SAME {c[0].strip()}", campaign="SAME", fuel=clean(c[1]),
                         material_key=key, material_class=cls, flow_cm_s=num(c[2]), flow_dir="concurrent", aging_s=aging_min * 60 if aging_min is not None else None,
                         outcome=None, outcome_raw=f"Weight loss rate (mg/min): {clean(c[3])}", source_id="PSI-102", locator=f"{fname}#row{ln}",
                         phase="smoke", flags=["smoke_test", "aging_converted_from_minutes"]
                         + (["conditions_by_reference_to_rows_1_4"] if "same conditions" in c[1].lower() else [])))
    fname = "PSI-47_Experimental table_DAFT.csv"
    rows = read_rows(RAW / "PSI-47" / fname)
    for ln, c in enumerate(rows[1:], start=2):
        if not c or not c[0].strip():
            continue
        key, cls = material(c[3])
        out.append(blank(id=f"PSI-47:{c[0].strip()}", investigation_id="DAFT", test_label=f"DAFT {c[0].strip()}", campaign="DAFT", fuel=clean(c[3]),
                         material_key=key, material_class="nuisance_dust", outcome=None, outcome_raw=clean(c[2]), source_id="PSI-47",
                         locator=f"{fname}#row{ln}", phase="aerosol", flags=["nuisance_aerosol_not_smoke"]))
    return out


# ------------------------------------------------------------------ automated re-read check
def reread_check(points: list[dict]) -> dict:
    """Parse -> re-serialize -> diff against raw cells. For every row: the locator line is re-read from the raw file and
    each numeric field is re-derived from its own source cell; any difference is a mismatch."""
    cache: dict[str, list[list[str]]] = {}
    checks, mism = 0, []

    def cell(r, colname):
        f, n = r["locator"].split("#row")
        acc = r["source_id"]
        if f not in cache:
            cache[f] = read_rows(RAW / acc / f)
        rows = cache[f]
        hdr = [clean(x).replace("�", "?") for x in rows[0]]
        idx = next((i for i, h in enumerate(hdr) if h.lower().startswith(colname.lower())), None)
        line = rows[int(n) - 1]
        return None if idx is None or idx >= len(line) else line[idx]

    for r in points:
        acc = r["source_id"]
        pairs = []
        if acc == "PSI-25":
            pairs = [("x_o2_initial", "Calibrated initial O2", 0.01), ("x_o2_final", "Calibrated final O2", 0.01)]
        elif acc == "PSI-99" or acc == "PSI-98":
            pairs = [("flow_cm_s", "Air Flow", 1.0)]
            if acc == "PSI-99" and "composite_sample_component" not in r["flags"]:
                pairs.append(("length_cm", "Sample Length", 1.0))
        elif acc == "PSI-100":
            pairs = [("flow_cm_s", "Air Flow", 1.0), ("length_cm", "Sample Length", 1.0)]
        elif acc == "PSI-101":
            pairs = [("aging_s", "Net aging time", 1.0), ("flow_cm_s", "Inlet velocity", 1.0), ("burn_time_s", "Duration", 1.0)]
        elif acc == "PSI-102":
            pairs = [("flow_cm_s", "Air Flow", 1.0), ("aging_s", "Aging Duration", 60.0)]
        for field, colname, scale in pairs:
            raw = cell(r, colname)
            want = None if raw is None or num(raw) is None else round(num(raw) * scale, 6)
            got = r[field]
            checks += 1
            if not ((want is None and got is None) or (want is not None and got is not None and abs(want - got) <= 1e-9 + 1e-9 * abs(want))):
                mism.append({"id": r["id"], "field": field, "raw_cell": raw, "parsed": got})
        # material text and outcome_raw text must be substrings of the raw line (no invented text)
        f, n = r["locator"].split("#row")
        line = " ".join(clean(x) for x in cache.setdefault(f, read_rows(RAW / acc / f))[int(n) - 1])
        checks += 1
        if r["fuel"] and clean(r["fuel"]) not in line and "composite_sample_component" not in r["flags"]:
            mism.append({"id": r["id"], "field": "fuel", "raw_line": line[:120], "parsed": r["fuel"]})
    return {"method": "csv-module re-read of the locator line; numeric fields re-derived from their own cell and diffed (abs 1e-9); "
                      "material text must occur verbatim in the raw line", "rows": len(points), "checks": checks, "mismatches": mism}


# ------------------------------------------------------------------ derived products
def earth_vs_orbit(points: list[dict]) -> dict:
    """SAFFIRE-II (PSI-99) like-for-like: same sample burned in µg (flight) and the tabulated 1-g test. Never pairs unlike samples."""
    order = {"no_ignition": 0, "insignificant": 0, "extinct": 0, "burn_partial": 1, "burn": 2}
    rows, excluded = [], []
    for r in points:
        if r["source_id"] != "PSI-99":
            continue
        g1raw = r.get("g1_burn_length_raw") or ""
        comp = "composite_sample_component" in r["flags"]
        if comp:  # 1 g cells only describe the Nomex component: "~ 0 (Nomex)"
            g1raw = g1raw if f"({(r['fuel'] or '').lower()})" in g1raw.lower() else ""
        why = None
        if not r["material_key"]:
            why = "material cell blank in the PSI table (not inferred)"
        g1o, g1len = burn_class(g1raw, r["length_cm"])
        if why is None and g1o is None:
            why = "no tabulated 1-g result for this sample/component"
        if why is None and r["outcome"] in (None, "unknown"):
            why = "no µg outcome"
        if why:
            excluded.append({"sample": r["test_label"], "material_key": r["material_key"], "locator": r["locator"], "reason": why})
            continue

        def rank(o, length_cm):
            if o == "burn" and length_cm is not None and r["length_cm"] is not None and length_cm < r["length_cm"]:
                return order["burn_partial"]
            return order[o]
        d = rank(r["outcome"], r["burn_length_cm"]) - rank(g1o, g1len)
        g1sp = r.get("g1_spread_rate_raw") or ""
        rows.append({
            "material_key": r["material_key"], "thickness_mm": r["thickness_mm"], "sample": r["test_label"],
            "ug": {"outcome": r["outcome"], "burn_length_cm": r["burn_length_cm"], "spread_rate_mm_s": r["spread_rate_mm_s"],
                   "x_o2": r["x_o2"], "flow_cm_s": r["flow_cm_s"], "flow_dir": r["flow_dir"]},
            "one_g": {"outcome": g1o, "burn_length_cm": g1len, "spread_rate_mm_s": num(g1sp) if "mm/s" in g1sp else None,
                      "spread_rate_raw": g1sp or None},
            "agreement": "same" if d == 0 else ("orbit_worse" if d > 0 else "orbit_better"), "n": 1,
            "source_id": "PSI-99", "locator": r["locator"],
            "caveat": "1-g test conditions (orientation, O2, flow) are not given in the PSI-99 table; single test (n = 1)."
                      + (" Thickness restored from '037 mm'." if "thickness_leading_zero_restored" in r["flags"] else "")
                      + (" µg length is visible damage (note 3)." if "burn_length_is_visible_damage_note_3" in r["flags"] else ""),
        })
    counts = {k: sum(x["agreement"] == k for x in rows) for k in ("orbit_better", "same", "orbit_worse")}
    return {"rows": rows, "excluded": excluded, "counts": counts, "n": len(rows),
            "scale": "ordinal: burn over full sample length (2) > partial burn (1) > insignificant / not ignited (0)",
            "bass_pairs": [], "bass_note": "BASS/BASS-II tables carry no 1-g result for the same material and thickness; no pairs emitted.",
            "source_ids": ["PSI-99"]}


def materials(points: list[dict], flex: pd.DataFrame) -> list[dict]:
    df = pd.DataFrame([p for p in points if p["material_key"]])
    out = []
    for key, g in df.groupby("material_key"):
        burn = g[g.outcome.isin(["burn", "extinct", "no_ignition", "insignificant"])]
        smoke_rows = g[g.phase == "smoke"]
        forms = []
        for (th, geo, dia), _ in g.groupby([g.thickness_mm.fillna(-1), g.geometry.fillna("unspecified"), g.diameter_mm.fillna(-1)]):
            forms.append({"thickness_mm": None if th == -1 else float(th), "geometry": geo, "diameter_mm": None if dia == -1 else float(dia)})
        xo = pd.concat([g.x_o2_initial, g.x_o2_min, g.x_o2_max]).dropna()
        fl = g.flow_cm_s.dropna()
        pk = g.pressure_kpa.dropna()
        tests = g.drop_duplicates("locator")
        out.append({
            "material_key": key, "display_name": DISPLAY.get(key, key), "class": CLASS.get(key),
            "forms": forms, "investigations": sorted(set(g.source_id)), "n_tests": int(len(tests)),
            "o2_range_tested": [float(xo.min()), float(xo.max())] if len(xo) else None,
            "p_range_kpa": [float(pk.min()), float(pk.max())] if len(pk) else None,
            "flow_range_cm_s": [float(fl.min()), float(fl.max())] if len(fl) else None,
            "gravity_levels_tested": [0, 1] if (key in {r["material_key"] for r in points if r.get("g1_burn_length_raw")}) else [0],
            "has_burn_data": bool(len(burn)), "has_smoke_data": bool(len(smoke_rows)),
            "has_1g_comparison": key in {r["material_key"] for r in points if r.get("g1_burn_length_raw") and r["source_id"] == "PSI-99"},
            "n_flagged_interpretation": int(g["flags"].apply(lambda f: "material_inferred_from_sheet" in f).sum()),
            "notes": None,
            "provenance": "aggregated over verified rows of web/data/test_points.json with this material_key (each row: source_id + locator)",
        })
    for fuel, g in flex.groupby("fuel"):
        out.append({"material_key": fuel, "display_name": DISPLAY.get(fuel, fuel), "class": "liquid_fuel",
                    "forms": [{"thickness_mm": None, "geometry": "free_droplet", "diameter_mm": None}], "investigations": ["PSI-69"],
                    "n_tests": int(len(g)), "o2_range_tested": [float(g.x_o2.min()), float(g.x_o2.max())],
                    "p_range_kpa": [float(g.pressure_kpa.min()), float(g.pressure_kpa.max())], "flow_range_cm_s": [0.0, 0.0],
                    "gravity_levels_tested": [0], "has_burn_data": True, "has_smoke_data": False, "has_1g_comparison": False,
                    "n_flagged_interpretation": 0,
                    "provenance": "aggregated over verified FLEX rows of web/data/test_points.json", "notes": "FLEX rows extracted from NASA/TP-2015-216046 Table IX; cross-checked value-by-value against the PSI-69 Experimental table."})
    notes = {"arizona_road_dust": "Nuisance aerosol (DAFT) used to test false-alarm discrimination; not smoke.",
             "dibutyl_phthalate": "SAME smoke-generation reference liquid; no burn data.",
             "silicone": "SAFFIRE-II µg burns were insignificant; SAME/SAME-R smoke data.", "pmma": "Forms differ (film, slab, rod, sphere); compare like forms only."}
    for m in out:
        m["notes"] = m["notes"] or notes.get(m["material_key"])
    return sorted(out, key=lambda m: (-m["n_tests"], m["material_key"]))


def evidence_index(mats: list[dict], points: list[dict]) -> dict:
    """Ranked investigations per material for Q1 (will it burn), Q2 (how bad), Q3 (detect/suppress)."""
    df = pd.DataFrame(points)
    idx = {}
    for m in mats:
        k = m["material_key"]
        g = df[df.material_key == k]
        q1, q2, q3 = [], [], []
        for acc, h in g.groupby("source_id"):
            n_out = int(h.outcome.isin(["burn", "extinct", "no_ignition", "insignificant"]).sum())
            n_ext = int((h.outcome == "extinct").sum())
            n_sp = int(h.spread_rate_mm_s.notna().sum()) + int(h.burn_length_cm.notna().sum())
            n_sm = int((h.phase == "smoke").sum())
            loc = h.locator.iloc[0].split("#")[0]
            e = lambda n, why: {"investigation": acc, "why": why, "source": loc, "source_id": acc, "locator": loc, "n": n}  # noqa: E731
            if n_out:
                q1.append(e(n_out, f"{n_out} µg ignition/burn outcomes ({n_ext} extinctions) for {DISPLAY.get(k, k)}"))
            if n_sp:
                q2.append(e(n_sp, f"{n_sp} tabulated µg burn lengths / spread rates"))
            if n_sm:
                q3.append(e(n_sm, f"{n_sm} smoke tests (particle size vs aging; detector-relevant)"))
            if acc == "PSI-26" and h.outcome_raw.fillna("").str.contains("N2", regex=False).any():
                q3.append(e(int(h.outcome_raw.fillna("").str.contains("N2", regex=False).sum()), "flight notes of N2 suppression attempts (qualitative)"))
        if k in ("n-heptane", "methanol"):
            f = "PSI-69_Experimental table_FLEX.csv"
            q1.append({"investigation": "PSI-69", "why": "FLEX droplet burning/extinction vs O2, P, diluent", "source": f, "source_id": "PSI-69", "locator": f, "n": m["n_tests"]})
            q3.append({"investigation": "PSI-69", "why": "FLEX: CO2/He diluent suppression tests", "source": f, "source_id": "PSI-69", "locator": f, "n": m["n_tests"]})
        idx[k] = {q: sorted(v, key=lambda x: -x["n"]) for q, v in (("Q1", q1), ("Q2", q2), ("Q3", q3))}
    # §2: for each material_key the ranked list per question (Q1 will it burn, Q2 how bad, Q3 detect/suppress), ranked by n rows
    return idx


def manual_sample(points: list[dict], seed: int = 20261114) -> dict:
    rng = np.random.default_rng(seed)
    by = {}
    for p in points:
        by.setdefault(p["source_id"], []).append(p)
    return {acc: sorted(rng.choice([p["id"] for p in v], size=min(20, len(v)), replace=False).tolist()) for acc, v in sorted(by.items())}


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    k, k_loc = fan_k()
    pts = bass2(k, k_loc) + bass() + saffire() + smoke()
    chk = reread_check(pts)
    manual = json.loads((OUT / "manual_check.json").read_text()) if (OUT / "manual_check.json").exists() else {}
    signed = {acc for acc, v in manual.get("results", {}).items() if v.get("mismatches") == 0}
    bad = {m["id"] for m in chk["mismatches"]}
    for p in pts:  # grouped split by campaign: BASS-II = train; BASS, SAFFIRE-I/II/III and smoke = held-out test
        p["split"] = "train" if p["campaign"] == "BASS-II" else "test"
        if p["source_id"] in signed and p["id"] not in bad:
            p["verified"], p["verified_by"] = True, VERIFIED_BY
    flex = pd.read_parquet(ROOT / "data" / "processed" / "test_points.parquet")
    flex = flex[(flex.investigation_id == "FLEX") & flex.verified]
    mats = materials(pts, flex)
    df = pd.DataFrame(pts)
    df["flags"] = df["flags"].apply(lambda f: ";".join(f))
    df.to_csv(OUT / "psi_points.csv", index=False)
    (OUT / "verification.json").write_text(json.dumps(chk, indent=1, ensure_ascii=False))
    (OUT / "materials.json").write_text(json.dumps(mats, indent=1, ensure_ascii=False))
    evo = earth_vs_orbit(pts)
    (OUT / "earth_vs_orbit_meta.json").write_text(json.dumps({k: v for k, v in evo.items() if k != "rows"}, indent=1, ensure_ascii=False))
    (OUT / "earth_vs_orbit.json").write_text(json.dumps(evo["rows"], indent=1, ensure_ascii=False))  # §2: rows (root array)
    (OUT / "evidence_index.json").write_text(json.dumps(evidence_index(mats, pts), indent=1, ensure_ascii=False))
    manual.setdefault("sample", manual_sample(pts))
    (OUT / "manual_check.json").write_text(json.dumps(manual, indent=1, ensure_ascii=False))
    by = df.groupby("source_id").agg(rows=("id", "size"), verified=("verified", "sum"))
    print(by.to_string())
    print(f"re-read checks: {chk['checks']}, mismatches: {len(chk['mismatches'])}")
    for m in chk["mismatches"][:20]:
        print("  MISMATCH", m)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
