# SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
"""Extract FLEX Appendix A (Table IX) and Appendix B figure captions from NASA/TP-2015-216046.

Every row carries source_id + locator (PDF page). Extinction mode (radiative / diffusive /
cool flame) is taken only from the authors' own per-test caption text in Appendix B; the
supporting snippet is stored with the row. Rows are written verified=False; human sign-off
(docs/HUMAN_TASKS.md) flips them via verify.py.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

import pandas as pd
import pdfplumber

ROOT = Path(__file__).resolve().parents[1]
PDF = ROOT / "data/raw/ntrs/flex_tp_2015_216046.pdf"
OUT = ROOT / "data/processed/flex_raw.csv"
SOURCE_ID = "ntrs-20150023456"

ROW = re.compile(
    r"^FLEX[–-](\d{3})\s+(\S+)\s+(\S+)\s+(\S+)\s+(Methanol|Heptane)\s+"
    r"([\d.–-]+)\s+([\d.–-]+)\s+([\d.–-]+)\s+([\d.–-]+)\s+([\d.–-]+)\s+"
    r"([\d.–-]+)\s+([\d.–-]+)\s+([\d.–-]+)\s+([~\d.–-]+)\s+(\w+)\s*$"
)
CAPTION = re.compile(r"Figure \d+\.—Test FLEX[–-](\d{3})\.(.*?)(?:NASA/TP—2015-216046|\Z)", re.S)


def num(s: str) -> float | None:
    return None if s in ("–", "-", "—") else float(s.lstrip("~"))


def classify(caption: str) -> tuple[str | None, str | None, bool, bool]:
    """Return (hot-flame extinction mode, snippet, mode_inferred, cool_flame) from caption text.

    Mode is taken from the authors' words ("radiativ*"/"diffusiv*"). If the caption only reports
    cool-flame burning after visible-flame extinction, the hot-flame mode is labelled radiative
    with mode_inferred=True, following Dietrich et al. (2014): large heptane droplets burned with
    a cool flame after the hot flame radiatively extinguished. Negated mentions ("no cool flame")
    do not count.
    """
    c = " ".join(caption.split())
    sentences = re.split(r"(?<=\.)\s+", c)
    neg = re.compile(r"\bno\b[^.]*cool flame|cool flame[^.]*\bnot\b", re.I)
    cool = [x for x in sentences if re.search(r"cool[- ]flame", x, re.I) and not neg.search(x)]
    for mode, pat in (("radiative_ext", r"radiativ"), ("diffusive_ext", r"diffusiv")):
        hit = [x for x in sentences if re.search(pat, x, re.I)]
        if hit:
            return mode, hit[0][:240], False, bool(cool)
    if cool:
        return "radiative_ext", cool[0][:240], True, True
    return None, None, False, False


def main() -> None:
    rows, captions = [], {}
    with pdfplumber.open(PDF) as pdf:
        for i in range(25, 34):  # Table IX, PDF pages 26-34 (report pages 20-28)
            for line in (pdf.pages[i].extract_text() or "").split("\n"):
                m = ROW.match(line.strip())
                if not m:
                    continue
                g = m.groups()
                rows.append(
                    dict(
                        test_label=f"FLEX-{g[0]}", cir_id=g[1], date=g[2], fuel=g[4].lower(),
                        p_mmHg=num(g[5]), x_o2=num(g[6]), x_n2=num(g[7]), x_co2=num(g[8]), x_he=num(g[9]),
                        d0_mm=num(g[10]), d_ext_mm=num(g[11]), K_mm2_s=num(g[12]), burn_time_s=num(g[13]),
                        test_end=g[14].lower(), source_id=SOURCE_ID,
                        locator=f"NASA/TP-2015-216046 Table IX, PDF p.{i + 1} (report p.{i - 5})",
                    )
                )
        for i in range(34, len(pdf.pages)):
            t = pdf.pages[i].extract_text() or ""
            for m in CAPTION.finditer(t):
                captions[f"FLEX-{m.group(1)}"] = (m.group(2), i + 1)
    df = pd.DataFrame(rows).drop_duplicates("test_label")
    modes = {k: classify(v[0]) + (v[1],) for k, v in captions.items()}
    empty = (None, None, False, False, None)
    df["ext_mode_caption"] = df.test_label.map(lambda k: modes.get(k, empty)[0])
    df["caption_snippet"] = df.test_label.map(lambda k: modes.get(k, empty)[1])
    df["mode_inferred"] = df.test_label.map(lambda k: modes.get(k, empty)[2])
    df["cool_flame"] = df.test_label.map(lambda k: modes.get(k, empty)[3])
    df["caption_locator"] = df.test_label.map(
        lambda k: f"NASA/TP-2015-216046 Appendix B, PDF p.{modes[k][4]}" if k in modes else None
    )
    df["digitized"] = False
    df["verified"] = False
    OUT.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(OUT, index=False)
    print(f"{len(df)} FLEX rows, {df.ext_mode_caption.notna().sum()} with caption extinction mode -> {OUT}")


if __name__ == "__main__":
    sys.exit(main())
