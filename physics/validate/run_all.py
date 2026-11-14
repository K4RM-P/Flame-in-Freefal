# SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
"""Validation V1-V10 (PRD §5.11) on held-out data. Writes web/data/validation/*.json and docs/VALIDATION.md.

Never tunes anything. Rows used: verified & split == 'test' for V5 and extinction-diameter parity.
"""
from __future__ import annotations

import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import numpy as np  # noqa: E402
import pandas as pd  # noqa: E402

from emberphys import droplet as D  # noqa: E402
from emberphys import suppression as SU  # noqa: E402
from emberphys.io import PARAMS, load_yaml, prop, save_json  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "web" / "data" / "validation"
T_INF = prop("constants", "T_amb")
P1 = prop("constants", "P_atm")


def atm(r: pd.Series) -> dict[str, float]:
    x = {k: v for k, v in {"O2": r.x_o2, "N2": r.x_n2, "CO2": r.x_co2, "HE": r.x_he}.items() if v > 0}
    s = sum(x.values())
    return {k: v / s for k, v in x.items()}


def metrics(pred: np.ndarray, obs: np.ndarray) -> dict[str, float]:
    e = pred - obs
    return {"n": int(len(obs)), "rmse": float(np.sqrt(np.mean(e**2))), "mape": float(np.mean(np.abs(e / obs)) * 100),
            "bias": float(np.mean(e))}


def main() -> None:
    vt = load_yaml("validation_targets")
    tp = pd.read_parquet(PARAMS.parent / "test_points.parquet")
    test = tp[tp.verified & tp.split.eq("test")]
    rows, results = [], {}

    def row(vid, model, quantity, published, predicted, criterion, passed, source, note=""):
        rows.append({"id": vid, "model": model, "quantity": quantity, "published": published, "predicted": predicted,
                     "criterion": criterion, "status": passed, "source": source, "note": note})

    # V1-V4 (+He) LOI from the droplet dual-extinction model (not fitted on LOIs)
    loi_pred = {}
    for vid, fuel, agent in (("V1", "n-heptane", None), ("V2", "methanol", None), ("V3", "n-heptane", "CO2"),
                             ("V4", "methanol", "CO2"), ("V4b", "n-heptane", "HE"), ("V4b", "methanol", "HE")):
        v = vt[vid]
        pub = v["value"][fuel] if isinstance(v["value"], dict) else v["value"]
        pred = D.loi(fuel, P1, T_INF, agent)
        loi_pred[(fuel, agent)] = pred
        ok = abs(pred - pub) <= v["tol"]
        row(vid if vid != "V4b" else f"V4b-{fuel}", "droplet", f"{fuel} LOI ({agent or 'O2/N2'})", pub, round(pred, 4),
            f"±{v['tol']}", "pass" if ok else "fail", v["source"],
            "" if ok else "Quasi-steady dual-extinction model; see VALIDATION.md discussion")
    # V3/V4/He from thermal suppression theory (T_crit,ug fitted on V1/V2 only)
    for vid, fuel, agent in (("V3", "n-heptane", "CO2"), ("V4", "methanol", "CO2"), ("V4b", "n-heptane", "HE"), ("V4b", "methanol", "HE")):
        v = vt[vid]
        pub = v["value"][fuel] if isinstance(v["value"], dict) else v["value"]
        pred = SU.loi_thermal(fuel, SU.t_crit(fuel, "ug"), T_INF, agent)
        ok = abs(pred - pub) <= v["tol"]
        row((vid if vid != "V4b" else f"V4b-{fuel}") + "-thermal", "suppression", f"{fuel} LOI ({agent}), thermal theory", pub,
            round(pred, 4), f"±{v['tol']}", "pass" if ok else "fail", v["source"],
            "" if ok else "Pure thermal theory under-predicts He effectiveness (He diffusivity / Lewis-number effect not modelled)")

    # V5 burning-rate constant on held-out FLEX campaigns
    parity_K = []
    for _, r in test[test.K_mm2_s.notna() & (test.K_mm2_s > 0)].iterrows():
        k = D.burning_rate(r.fuel, atm(r), r.pressure_kpa * 1e3, T_INF) * 1e6
        parity_K.append({"id": r.id, "fuel": r.fuel, "obs": r.K_mm2_s, "pred": k, "x_o2": r.x_o2, "P_kPa": r.pressure_kpa,
                         "diluent": r.diluent, "source_id": r.source_id, "locator": r.locator})
    pk = pd.DataFrame(parity_K)
    mK = metrics(pk.pred.values, pk.obs.values)
    mK_f = {f: metrics(g.pred.values, g.obs.values) for f, g in pk.groupby("fuel")}
    row("V5", "droplet", "FLEX burning-rate constant K (held-out campaigns)", "per test", f"MAPE {mK['mape']:.1f}% (n={mK['n']})",
        "MAPE ≤ 20%", "pass" if mK["mape"] <= 20 else "fail", vt["V5"]["source"])
    results["droplet_K"] = {"metrics": mK, "by_fuel": mK_f, "parity": parity_K, "units": "mm^2/s"}

    # Extinction diameters on held-out, author-labelled tests
    parity_d = []
    for _, r in test[test.outcome.isin(["diffusive_ext", "radiative_ext"]) & test.d_ext_mm.notna()].iterrows():
        dd, dr, _ = D.extinction_diameters(r.fuel, atm(r), r.pressure_kpa * 1e3, T_INF)
        pred = dd if r.outcome == "diffusive_ext" else dr
        parity_d.append({"id": r.id, "fuel": r.fuel, "mode": r.outcome, "obs": r.d_ext_mm, "pred": pred * 1e3 if pred else None,
                         "x_o2": r.x_o2, "P_kPa": r.pressure_kpa, "diluent": r.diluent, "source_id": r.source_id,
                         "locator": r.caption_locator, "snippet": r.caption_snippet})
    pdx = pd.DataFrame(parity_d)
    ok = pdx[pdx.pred.notna()]
    md = metrics(ok.pred.values, ok.obs.values) | {"n_no_burning_predicted": int(pdx.pred.isna().sum())}
    results["droplet_dext"] = {"metrics": md, "parity": parity_d, "units": "mm"}

    for vid in ("V6", "V7", "V8", "V9", "V10"):
        v = vt[vid]
        row(vid, {"V6": "spread", "V7": "spread", "V8": "boundary", "V9": "habitat", "V10": "smoke"}[vid], v["quantity"],
            v.get("value", "—"), None, v.get("criterion") or (f"±{v['tol']}" if "tol" in v else "inside published range"), "pending data", v["source"],
            f"Needs: {v['data_needed']} (docs/HUMAN_TASKS.md). Model ships as 'Uncalibrated — theory only'.")
    results["loi_curves"] = loi_curves()
    save_json(OUT / "summary.json", {"targets": rows})
    for k, v in results.items():
        save_json(OUT / f"{k}.json", v)
    write_md(rows, mK, mK_f, md)
    for r in rows:
        print(f"{r['id']:<22}{r['status']:<14}{r['published']!s:<12}{r['predicted']!s}")


def loi_curves() -> dict:
    """Extinction-diameter curves vs O2 (for the Validation Lab plot) with FLEX labelled points."""
    out = {}
    for fuel in ("n-heptane", "methanol"):
        xs, dd, dr = [], [], []
        for x in np.linspace(0.10, 0.40, 61):
            a, b, _ = D.extinction_diameters(fuel, {"O2": float(x), "N2": 1 - float(x)}, P1, T_INF)
            xs.append(float(x)); dd.append(a * 1e3 if a else None); dr.append(b * 1e3 if b else None)
        out[fuel] = {"x_o2": xs, "d_diff_mm": dd, "d_rad_mm": dr, "loi": D.loi(fuel, P1, T_INF)}
    return out


def write_md(rows, mK, mK_f, md) -> None:
    lines = ["# Validation report (auto-generated by physics/validate/run_all.py)", "",
             "Held-out data only. Nothing here was used for fitting. LOIs (V1-V4) were never used by the droplet fit;",
             "the suppression model's µg T_crit was fitted on V1/V2 only, so its V3/V4/He rows are held-out predictions.", "",
             "| ID | Model | Quantity | Published | Predicted | Criterion | Status |", "|---|---|---|---|---|---|---|"]
    for r in rows:
        lines.append(f"| {r['id']} | {r['model']} | {r['quantity']} | {r['published']} | {r['predicted'] if r['predicted'] is not None else '—'} | {r['criterion']} | **{r['status']}** |")
    lines += ["", "## Held-out metrics", "",
              f"- Burning-rate constant K: n={mK['n']}, RMSE={mK['rmse']:.3f} mm²/s, MAPE={mK['mape']:.1f}%, bias={mK['bias']:+.3f} mm²/s",
              *[f"  - {f}: n={m['n']}, MAPE={m['mape']:.1f}%, bias={m['bias']:+.3f}" for f, m in mK_f.items()],
              f"- Extinction diameter (author-labelled modes): n={md['n']}, RMSE={md['rmse']:.2f} mm, MAPE={md['mape']:.1f}%, "
              f"bias={md['bias']:+.2f} mm; {md['n_no_burning_predicted']} tests where the model predicts no quasi-steady burning", "",
              "## Discussion of failures", "",
              "- **Heptane LOI (droplet model)** is under-predicted. Only 17 heptane tests in the training split carry an",
              "  author-stated extinction mode, and the predicted radiative-extinction diameter is almost flat in O2. The",
              "  quasi-steady model ignores unsteady flame growth, soot radiation and the cool-flame regime that follows",
              "  heptane radiative extinction in FLEX. Freeing the Burke-Schumann temperature factor did not help (tried, reverted).",
              "- **Helium**: pure thermal theory ranks He as the weakest diluent per mole (lowest cp), but FLEX shows He",
              "  nearly as effective as CO2. The likely cause is He's high thermal diffusivity (non-unity Lewis number),",
              "  which thermal inerting theory does not include. This is listed as an Evidence Gap, not hidden.",
              "- **V6-V10** need digitized BASS-II, BRE, Saffire and SAME-R data (see docs/HUMAN_TASKS.md). Those models ship",
              "  as 'Uncalibrated — theory only'. No validation pass is claimed for them.", ""]
    (ROOT / "docs" / "VALIDATION.md").write_text("\n".join(lines))


if __name__ == "__main__":
    main()
