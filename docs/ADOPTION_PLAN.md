# Adoption plan — feature/adopt-ideas (2026-11-14)

Sources: (A) "Idea worth adopting" rows in `docs/INSPIRATION_FROM_project-max-q-dashboard.md` (story-fit, science risk ≠ high);
(B) verified intel from Space Apps Connect + the live PSI API (checked 2026-11-14). EmberAtlas wins every overlap.
Time budget 3.5 h. Score = rubric lift (criteria moved, 1–5 total weight) ÷ effort hours.

## Facts checked live before planning (they change some specs)
- PSI metadata lists all 25 requested accessions. File search returns HTTP 500 for **PSI-21 (CLD Flame)** and **PSI-106 (SLICE)**; DOI lookup returns 500 for PSI-60/62/115/117. Logged, cached, not retried.
- **PSI-20 (ACME BRE)**: the metadata lists 14.7 psia/21 %, 10.2 psia/26.5 % and 8.2 psia/34 % as atmospheres that "will be examined" (the flight *objective*). The Experimental table lists the O₂ levels of ignited flames per day but says chamber pressures "are not identified in this summary table". B4 therefore says "34 % O₂ flames ignited (pressure per test not in the PSI table)", **not** "directly tested at 8.2 psia".
- **PSI-99 SAFFIRE-II** table holds µg burn length / spread length and 1 g burn length / spread rate per sample, which is enough for B3. The 1 g test conditions are not given in the table. Two rows have a blank material (2-6, 2-9) and are excluded from the like-for-like matrix.
- **BASS / BASS-II tables have no 1 g results**, so they add no rows to the Earth-vs-orbit matrix (B3 spec: only where like-for-like exists).
- **PSI-25 fan calibration** file states its own conversion: `U = 1.0066(AIR)` (Air display → cm/s, SPICE fan calibration at the centerline). The pipeline parses the factor from the file and stores the cell locator.
- **SAME-R detector data** holds scatter-detector voltages but **no alarm thresholds/states**, so no alarm statement is possible (B5 rule: omit).
- There is **no boundary model** (STATUS: no solid burn/extinct data). B7's "ventilation-shutdown caution from the boundary model" is shown as "not available" with the reason, plus cited flight observations only.

## Plan

| # | Item | Src | Rubric lift | Story fit (Maya) | Effort | Risk | Files touched | Order |
|---|---|---|---|---|---|---|---|---|
| B1 | Live PSI API ingestion (metadata, DOI, small tables, manifest) | B | Relevance, Validity (5) | Every number she defends traces to a PSI accession + file | 0.75 h | none | physics/pipeline/fetch_psi.py, data/processed/psi_catalog.json, export.py, lib/ranking.ts, evidence page | 1 |
| B2 | Experimental-table ingestion (BASS-II, BASS, SAFFIRE-I/II/III, SAME, SAME-R, DAFT, SPICE, BRE; inspect FLEX/CFI-G) | B | Validity, Best use of data (5) | Gives her the actual ISS test matrix for her fabrics | 1.0 h | low | physics/pipeline/ingest_psi.py, data/psi_tables.yaml, processed/psi/*.csv, coverage, Evidence > Data | 2 |
| B3 | Earth test vs orbit verdict matrix (SAFFIRE-II) | B | Impact, Creativity, Validity (5) | "Does my 1 g rating hold in orbit?" — her sign-off question | 0.6 h | low (framing rules) | ingest_psi.py, web/components/EarthVsOrbit.tsx, evidence + console | 3 |
| B4 | Exploration-atmosphere evidence (ACME BRE PSI-20) | B | Impact (4) | Her 34 % O₂ habitat: the one flight dataset at that O₂ | 0.35 h | low (no overclaim) | web/components/AtmosphereEvidence.tsx, console | 4 |
| B6 | Suppression framing (ideal flame temperature, He as finding) | B | Validity (3) | She must not read T_crit as measured | 0.25 h | none | suppression card, /models/suppression | 5 |
| B8 | Compliance + submission hygiene (SI disclosure, references JSON, limitations, PSI link, history copy) | B | Presentation, eligibility (5) | Keeps the project eligible | 0.35 h | none | README, docs/REFERENCES.json, /methods, landing | 6 |
| B5 | Detection multi-measure view (SAME-R M0/M1/MPASS/DustTrak, DAFT dust) | B | Validity (3) | Her detector choice: number vs mass signals | 0.5 h | low | ingest_psi.py, components/SmokeMeasures.tsx, /implications | 7 |
| B7 | Design-suggestion panel (concept recommendations, cited) | B | Impact, Presentation (4) | Ends her story with an action | 0.4 h | low | /implications | 8 |
| A3 | Evidence compare "what changed" diff (minimal pair) | A | Validity, Presentation (2) | Shows which variable changed between two tests | 0.25 h | none | lib/diff.ts, evidence page, tests | 9 |
| A2 | Gravitational settling velocity in the smoke module | A | Validity, Impact (2) | Does smoke settle at 1/6 g before the detector? | 0.5 h | low | emberphys/smoke.py, properties.yaml, TS port, golden vectors | 10 (cut line) |

Total planned ≈ 4.95 h of nominal effort with overlap savings from shared ingestion work (B2/B3/B5 share one parser); A2 sits on the cut line and is dropped first.

## Deferred (below the 3.5 h cut line or failing a rule)
- **A1 NASA imagery** — needs per-image licence/credit review and a direct nasa.gov download; also must avoid NASA logos (B8). Next session.
- **A4 Saffire Table 2 digitization (NTRS 20210011521)** — partly superseded by B2 (PSI-98/99/100 tables now ingested); flame-size values in Table 2 still need the paper.
- **A5 1-D smoke transport time** — M effort; needs a bounded eddy-diffusivity source.
- **Answer-style toggle** — touches the agent + guard; low rubric lift.
- **PSI-21, PSI-106 files** — API returns HTTP 500; listed in HUMAN_TASKS.

## Outcome (shipped on feature/adopt-ideas, each gated by pytest + vitest + next build + Playwright incl. axe)

| # | Item | Commit | Notes |
|---|---|---|---|
| B1 | Live PSI API ingestion | 8a2e990 | 25 accessions, 25 files, sha256 manifest; cache-first; HTTP 500s (PSI-21/106 listings, 4 DOIs) cached and reported |
| B2 | Experimental-table ingestion | 58bc137 | 2,818 rows from 18 accessions; 6 tables normalized; FLEX PSI-69 vs NTRS: 1,533 values, 0 mismatches |
| B3 | Earth test vs orbit matrix | bae94ca | 7 like-for-like SAFFIRE-II samples: 4 burned less in orbit, 3 matched, 0 more; BASS/BASS-II add no rows (no 1 g data) |
| B4 | Exploration-atmosphere evidence | 1dfaf31 | BRE 34 % O₂ flames on 13 of 18 days; objective atmospheres parsed from live metadata; no pressure match claimed |
| B6 | Suppression framing | c80a95c | |
| B8 | Compliance + submission hygiene | f473f2b | REFERENCES.json, SI headers (106 files), Limitations, PSI link; no Apollo/incident copy existed |
| B5 | Detection multi-measure view | 0217fee | number spread 1.6× vs mass 31× across materials; no alarm claim (no thresholds in data) |
| B7 | Design-suggestion panel | df61ca3 | ventilation item shows "not computed" (no boundary model) |
| A3 | "What changed" diff | c37cb74 | |
| A2 | Gravitational settling (SM4) | ef68b08 | particle density = unit-density convention (TODO_VERIFY) |

Time: all items finished inside the 3.5 h budget; no item exceeded its time-box by 50 %, so nothing was downgraded.
