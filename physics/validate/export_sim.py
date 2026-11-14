# SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
"""Export simulator inputs to web/data: PSI-100 telemetry (rows on the T channel's clock, P matched by nearest
earlier sample), the spread calibration, and materials.json built only from PSI rows (source_id + locator)."""
import bisect, csv, json, pathlib, re
ROOT = pathlib.Path(__file__).resolve().parents[2]
P, W = ROOT / "physics/data/processed", ROOT / "web/data"

tel = json.loads((P / "psi/saffire_telemetry.json").read_text())
ch = tel["channels"]
pt = [r[0] for r in ch["P_Pa"]]
rows = []
for t, T, line in ch["T_K"]:
    if -60 <= t <= 600:
        j = bisect.bisect_right(pt, t) - 1
        rows.append({"t_s": t, "T_K": T, "P_Pa": ch["P_Pa"][j][1] if j >= 0 else None, "line": line})
out = {k: v for k, v in tel.items() if k != "channels"}
out["locator"] = tel["file"]
out["rows"] = rows
(W / "psi/saffire_telemetry.json").write_text(json.dumps(out, indent=1))
(W / "params/spread.json").write_text((P / "params/spread.json").read_text())

# materials.json: aggregate PSI solid tables (Saffire, BASS-II) and smoke tables (SAME-R) per material.
props = json.loads((W / "properties.json").read_text())
solids = props.get("fuels", props)
KEYS = {"sibal": r"sibal", "pmma": r"pmma", "cotton": r"cotton", "nomex": r"nomex", "kapton": r"kapton",
        "teflon": r"teflon|ptfe", "silicone": r"silicone", "lamp_wick": r"wick", "pyrell": r"pyrell", "kydex": r"kydex"}
def key_of(s):
    s = (s or "").lower()
    return next((k for k, rx in KEYS.items() if re.search(rx, s)), None)
def fnum(x):
    try: return float(x)
    except (TypeError, ValueError): return None
mats = {}
def add(k, acc, loc, o2=None, flow=None, th=None, burn=False, smoke=False, name=None):
    m = mats.setdefault(k, {"material_key": k, "display_name": name or k, "n_tests": 0, "investigations": [], "o2": [],
                            "flow": [], "th": set(), "has_burn_data": False, "has_smoke_data": False, "sources": []})
    m["n_tests"] += 1
    if acc not in m["investigations"]: m["investigations"].append(acc)
    if o2 is not None: m["o2"].append(o2)
    if flow is not None: m["flow"].append(flow)
    if th is not None: m["th"].add(round(th, 7))
    m["has_burn_data"] |= burn; m["has_smoke_data"] |= smoke
    m["sources"].append({"source_id": acc, "locator": loc})
def rd(n): return list(csv.DictReader(open(P / "psi" / n)))
for r in rd("saffire.csv"):
    if "flow visual" in (r.get("notes") or "").lower(): continue
    k = key_of(r["material"])
    if k: add(k, r["accession"], r["locator"], fnum(r["x_o2"]), (fnum(r["flow_cm_s"]) or 0) / 100 or None,
              (fnum(r["thickness_mm"]) or 0) / 1000 or None, burn=True, name=r["material"])
for r in rd("bass2.csv"):
    k = key_of(r["material"] or r["sample_text"])
    if k: add(k, r["accession"], r["locator"], fnum(r["x_o2_initial"]), (fnum(r["flow_cm_s"]) or 0) / 100 or None,
              (fnum(r["thickness_mm"]) or 0) / 1000 or None, burn=True, name=r["material"])
for r in rd("same_r.csv"):
    k = key_of(r["material"])
    if k: add(k, r["accession"], r["locator"], smoke=True, name=r["material"])
res = []
for k, m in sorted(mats.items(), key=lambda kv: -kv[1]["n_tests"]):
    res.append({"material_key": k, "display_name": m["display_name"], "n_tests": m["n_tests"], "investigations": m["investigations"],
                "o2_range": [min(m["o2"]), max(m["o2"])] if m["o2"] else None,
                "flow_range_m_s": [min(m["flow"]), max(m["flow"])] if m["flow"] else None,
                "thicknesses_m": sorted(m["th"]), "has_burn_data": m["has_burn_data"], "has_smoke_data": m["has_smoke_data"],
                "properties_key": k if k in solids and m["has_burn_data"] else None, "sources": m["sources"]})
(W / "materials.json").write_text(json.dumps(res, indent=1))
print(len(rows), "telemetry rows;", [(m["material_key"], m["n_tests"], m["properties_key"]) for m in res])
