# EmberAtlas — validated microgravity fire-safety models on NASA PSI data

*NASA Space Apps Challenge 2026 · Flame in Freefall.* NASA's ISS fire experiments, turned into combustion models an Artemis
designer can run — with an equation, uncertainty band, validation score and source for every number.

![demo GIF placeholder](docs/demo.gif)

## What it does
- **Fire Risk Console**: pick a crew atmosphere (ISS, Orion, 30%/70.3 kPa Moon base, 34%/56.5 kPa lunar habitat, rover, Mars), toggle µg / Moon / Mars / 1 g, and see flame spread, CO₂ needed to inert, cabin consequences and smoke size — each with ⓘ (equation, inputs, assumptions, validation, sources).
- **Model calculators** (`/models/*`) with Monte Carlo p05–p95 bands, extrapolation badges and Markdown engineering-report export.
- **Validation Lab**: published targets and held-out FLEX campaigns, parity plots, metrics, and the data rows used. Failures are shown.
- **Evidence Explorer**: relevance ranking of 16 PSI investigations (editable weights), cards, compare view, CSV/JSON export with provenance.
- **Gaps**: data-coverage map, conflicting evidence (He vs CO₂), coverage-based next-experiment proposals.
- **Ask EmberAtlas**: a Claude agent (`claude-sonnet-5-5`) whose tools are the physics models and the data; a numeric guard rejects any number not found in tool output. Works offline in demo mode.

## The physics (`physics/emberphys`, Python = source of truth; TypeScript port matches golden vectors to 1e-6)
| Module | Equations | Reference |
|---|---|---|
| thermo | NASA 7-coefficient cₚ, h (GRI-Mech 3.0); mixture-averaged k; α ∝ 1/P | GRI-Mech 3.0; Kee et al. |
| flame_temp | Burke–Schumann Z_st, T_f | Turns |
| droplet | d²-law K = 8k/(ρ_l cₚ) ln(1+B); standoff; Damköhler extinction with radiative loss (dual extinction); LOI where the branches meet | Turns; Chao, Law & T'ien 1990 |
| suppression | Critical adiabatic flame temperature with 13.1 MJ/kg O₂ | Huggett 1980; SFPE (Beyler) |
| spread | de Ris thin (π/4, full thickness) / thick, F(Da) | de Ris 1969; Quintiere; Fernandez-Pello |
| gravity | u_b = (g α ΔT/T∞)^{1/3}, equivalent flow (bounded estimate) | Fernandez-Pello; Olson 1991 |
| habitat | Well-mixed closed-volume ODE, O₂ consumption, CO yield, SMAC time-to-limit | Huggett; JSC 20584 Rev C |
| smoke | Smoluchowski coagulation, slip-corrected Brownian kernel | Seinfeld & Pandis |

## Validation summary (auto-copied from docs/VALIDATION.md)
| ID | Model | Quantity | Published | Predicted | Criterion | Status |
|---|---|---|---|---|---|---|
| V1 | droplet | n-heptane LOI (O2/N2) | 0.15 | 0.1143 | ±0.02 | **fail** |
| V2 | droplet | methanol LOI (O2/N2) | 0.12 | 0.118 | ±0.02 | **pass** |
| V3 | droplet | n-heptane LOI (CO2) | 0.17 | 0.1306 | ±0.02 | **fail** |
| V4 | droplet | methanol LOI (CO2) | 0.14 | 0.1337 | ±0.02 | **pass** |
| V4b-n-heptane | droplet | n-heptane LOI (HE) | 0.15 | 0.1026 | ±0.02 | **fail** |
| V4b-methanol | droplet | methanol LOI (HE) | 0.14 | 0.1086 | ±0.02 | **fail** |
| V3-thermal | suppression | n-heptane LOI (CO2), thermal theory | 0.17 | 0.1686 | ±0.02 | **pass** |
| V4-thermal | suppression | methanol LOI (CO2), thermal theory | 0.14 | 0.1433 | ±0.02 | **pass** |
| V4b-n-heptane-thermal | suppression | n-heptane LOI (HE), thermal theory | 0.15 | 0.1286 | ±0.02 | **fail** |
| V4b-methanol-thermal | suppression | methanol LOI (HE), thermal theory | 0.14 | 0.0972 | ±0.02 | **fail** |
| V5 | droplet | FLEX burning-rate constant K (held-out campaigns) | per test | MAPE 13.3% (n=66) | MAPE ≤ 20% | **pass** |
| V6 | spread | PMMA rod limiting O2, ug vs 1 g | {'ug': 0.17, '1g': 0.18} | — | ±0.01 | **pending data** |
| V7 | spread | BASS-II opposed spread vs flow (held-out) | — | — | MAPE <= 30%, peak at intermediate flow | **pending data** |
| V8 | boundary | ACME BRE: extinct at 21% O2 within 40 s; steady at 26.5/34/40% | — | — | classification | **pending data** |
| V9 | habitat | Saffire vehicle T, P, CO2 rise for ~10 kW fire | — | — | within 30% on held-out flight | **pending data** |
| V10 | smoke | SAME-R mean particle size after aging | [200, 400] | — | inside published range | **pending data** |

Highlights: burning-rate constant K on held-out FLEX campaigns, MAPE 13.3% (n = 66). Thermal-inerting theory with a µg T_crit fitted
only on O₂/N₂ LOIs **predicts the held-out CO₂ LOIs** (heptane 0.169 vs 0.17; methanol 0.143 vs 0.14) and **fails for helium** —
an honest, documented evidence gap. Spread, habitat and smoke ship as "Uncalibrated — theory only" until BASS-II / Saffire / SAME-R figures are digitized.

## Data provenance
- 276 FLEX tests extracted from NASA/TP-2015-216046 Table IX (NTRS 20150023456) with pdfplumber; 275 verified (visual PDF spot-check, 0 mismatches; human countersign pending). Extinction modes come only from the authors' Appendix B captions. Every row has `source_id` + `locator` (PDF page).
- Every property/limit lives in `physics/data/*.yaml` with a `source`; uncertain values are flagged `TODO_VERIFY` (see `docs/HUMAN_TASKS.md`).
- Coverage today: **1 investigation with verified rows** (FLEX). The PRD target of ≥400 rows from ≥4 investigations is not yet met — see `docs/STATUS.md`.

## How to run
```bash
make venv          # Python 3.11 venv via uv
make all           # data → fit → validate → vectors → export → test
cd web && pnpm install && pnpm dev     # http://localhost:3000
pnpm test && pnpm build && pnpm e2e    # vitest (golden vectors, guard, golden questions), build, Playwright
pnpm demo-cache    # rebuild the 12 golden answers (live Claude if ANTHROPIC_API_KEY is set)
pip install "git+https://github.com/K4RM-P/Flame-in-Freefal.git#subdirectory=physics"
```
Environment: `ANTHROPIC_API_KEY` (server-side only), `DEMO_MODE=1` to force cached answers.

## Limitations
PSI contains microgravity and 1 g data only; partial-gravity values are bounded estimates. Burke–Schumann temperatures overpredict.
The droplet model under-predicts the heptane LOI; both models miss the helium effect. Not for engineering certification.

## Use of AI
The Claude API (Anthropic) powers the Ask agent at runtime; answers are constrained to tool outputs and checked by a numeric guard.
The codebase was built with Claude Code. Offline demo answers are composed by templates from the same tool outputs and are labelled as such.

## References
See `physics/data/sources.yaml` (rendered on /methods) — FLEX (Dietrich et al. 2014, NASA/TP-2015-216046), BASS-II (Sci. Rep. 2017),
Saffire (NTRS 20180005168, 20210011521, ICES-2024-365), ACME BRE (Dehghani), SAME/SAME-R, de Ris 1969, Fernandez-Pello 1981, Olson 1991,
Turns, Quintiere, Huggett 1980, SFPE Handbook, NFPA 2001, Chao–Law–T'ien 1990, Westbrook–Dryer 1981, GRI-Mech 3.0, NIST WebBook, Incropera,
JSC 20584 Rev C, NASA-STD-3001, LUCI and FM2 (outside PSI). Software: Next.js, React, Tailwind CSS, Plotly.js, KaTeX, Zustand, Zod,
Anthropic SDK, Vitest, Playwright, NumPy, SciPy, pandas, PyArrow, scikit-learn, PyYAML, pdfplumber, pytest.

## License
MIT — see LICENSE. Credits in CREDITS.md.
