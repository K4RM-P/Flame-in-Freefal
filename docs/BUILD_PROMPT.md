# Claude Code Build Prompt — EmberAtlas

> **How to use:** create an empty repo folder, put `EmberAtlas_PRD.md` at `docs/PRD.md`, start Claude Code in the repo root, and paste everything below the line as the first message. Run a **second** Claude Code session for the web track once Phase 1 is committed (the prompt says when). Keep this file open; it's your playbook.

---

You are the lead engineer and a combustion-science-literate developer building **EmberAtlas** for NASA Space Apps 2026 (challenge: *Flame in Freefall*). The full spec is in `docs/PRD.md`. **Read it completely before writing code**, especially §5 (physics), §6 (data), §9 (architecture) and §10 (acceptance criteria).

## Mission
Build a **validated, physics-based** fire-safety toolkit on NASA PSI microgravity combustion data, with a tool-grounded AI analyst on top. It must be scientifically correct, honest about uncertainty, demo-ready, and finished **by Sunday 2026-11-15 18:00 local time (feature freeze)**. Judges are NASA SMEs: scientific validity beats visual flash, but it must also look polished.

## Prime directives (non-negotiable)
1. **No invented science.** Every physical constant, property, limit and data point lives in a data file with a `source` field (citation + locator). If you don't know a value, add it as `TODO_VERIFY` with the best literature candidate and the reference to check, then flag it in `docs/HUMAN_TASKS.md`. Never silently guess.
2. **No invented data.** Experimental rows come only from the pipeline, with `source_id`, `locator`, `digitized` and `verified` fields. Models train only on `verified == true` rows.
3. **Python is the scientific source of truth** (`physics/emberphys`). TypeScript ports in `web/lib/physics` must reproduce `shared/golden_vectors.json` to a relative tolerance of 1e-6.
4. **Every model output** returns `{value, units, uncertainty{p05,p50,p95}, inputs, equation_ids, assumptions[], validity{in_envelope, nearest_data_distance}, sources[]}`.
5. **Validation is a feature.** Never tune on test-split data. If a validation target fails, report it honestly in the Validation Lab with an explanation. Don't hide it.
6. **Partial gravity is never "measured."** PSI has no partial-g data. Gravity results are *bounded estimates* (bands), and external data (LUCI, FM2) is always labelled "outside PSI".
7. **Efficiency:** work in the phase order below, respect the time-boxes, keep dependencies minimal, write the simplest correct implementation, and don't gold-plate. If a task exceeds its time-box by 50%, stop, write a note in `docs/STATUS.md`, ship the simpler fallback in the PRD, and move on.
8. **Verify before claiming done:** run `make test` (Python) and `pnpm -C web test && pnpm -C web build` at the end of every phase; fix failures before committing. Commit after each phase with a clear message.

## Step 0 — Set up (≤ 30 min)
Create this monorepo (MIT license):

```
emberatlas/
  CLAUDE.md  README.md  LICENSE  Makefile  CREDITS.md
  docs/ (PRD.md, STATUS.md, HUMAN_TASKS.md, VALIDATION.md)
  physics/ (pyproject.toml → package "emberphys", Python 3.11)
    emberphys/ __init__.py thermo.py flame_temp.py spread.py gravity.py droplet.py suppression.py
               boundary.py smoke.py habitat.py uq.py validity.py io.py
    pipeline/ fetch.py extract_tables.py extract_llm.py normalize.py verify.py split.py build.py
    fit/ fit_droplet.py fit_suppression.py fit_spread.py fit_boundary.py fit_smoke.py fit_habitat.py
    validate/ run_all.py  (writes web/data/validation/*.json + docs/VALIDATION.md)
    tests/
    data/ properties.yaml missions.yaml limits.yaml sources.yaml raw/(gitignored) processed/ digitized/
  web/ (Next.js App Router, TypeScript strict, Tailwind, shadcn/ui, plotly.js via react-plotly.js, katex, zustand, zod, @anthropic-ai/sdk, vitest, playwright)
  shared/golden_vectors.json
```

Python deps (pin them): numpy, scipy, pandas, pyarrow, scikit-learn, pyyaml, pdfplumber, camelot-py (optional; fall back to pdfplumber), anthropic, pytest, mypy. **Don't add Cantera**; we use NASA 7-coefficient polynomials directly.

Write `CLAUDE.md` with exactly these rules (you will follow them in every later session):

```markdown
# EmberAtlas — rules for Claude Code
Spec: docs/PRD.md (authoritative). Status: docs/STATUS.md. Human tasks: docs/HUMAN_TASKS.md.
- Science source of truth = physics/emberphys (Python). TS ports must match shared/golden_vectors.json (rtol 1e-6).
- Never hard-code a property, constant, limit or data value in code. Read from physics/data/*.yaml or processed data, each with source.
- Unknown value → TODO_VERIFY in yaml + entry in docs/HUMAN_TASKS.md. Never guess silently.
- Internal units SI (K, Pa, m, s, kg). Convert only at I/O. Carry O2 as x_o2, p_o2, and y_o2.
- Every model returns ModelResult {value, units, uncertainty{p05,p50,p95}, inputs, equation_ids, assumptions, validity, sources}.
- Models train only on verified rows; never fit on split=="test".
- Partial gravity = bounded estimate, never "measured". External data labelled "outside PSI".
- AI answers only from tool outputs; lib/ai/guard.ts rejects numbers not present in tool output.
- UI: dark theme, accent #FF6B35, colorblind-safe (burn ● / extinct ✕), KaTeX equations, Plotly science plots.
- Before saying done: `make test` and `pnpm -C web test && pnpm -C web build` pass.
- Time-box discipline: over budget by 50% → simpler fallback, note in STATUS.md, move on.
Commands: make data | make fit | make validate | make vectors | make test | make all | pnpm -C web dev
```

The `Makefile` targets are: `data` (pipeline), `fit`, `validate`, `vectors` (generate golden vectors), `export` (write web JSON), `test`, and `all` (= data fit validate vectors export test).

## Phase 1 — Science core in Python (≤ 4 h). Use parallel subagents.
Implement the modules exactly per PRD §5. Use subagents in parallel, one per group, then integrate:
- **Subagent A:** `thermo.py` (NASA 7-coefficient cₚ/h for O₂, N₂, CO₂, H₂O, He, Ar, CO from GRI-Mech 3.0 thermo data, with the citation in `sources.yaml`; air k_g(T) and μ(T); mixture conversions mole↔mass; p_O₂), `flame_temp.py` (Burke–Schumann T_f per §5.2, with optional calibration factor).
- **Subagent B:** `droplet.py` (d²-law K, transfer number B, standoff ratio; diffusive and radiative extinction criteria with calibratable critical parameters; LOI solver = O₂ where the two extinction diameters meet; cool-flame flag), `suppression.py` (critical adiabatic flame temperature inerting per §5.6, with ΔH_O₂ = 13.1 MJ/kg; solve the agent mole fraction for N₂, CO₂, He at a given base atmosphere; T_crit separately for 1 g and µg).
- **Subagent C:** `spread.py` (de Ris thin and thick per §5.3; use **full thickness with C_thin = π/4** and document it; smooth thin/thick blend; Damköhler factor F(Da) as a logistic in ln Da with fit parameters; low-flow quench warning), `gravity.py` (u_b = (g α_g ΔT/T∞)^{1/3}; equivalent relative flow; returns a band [µg, g-equivalent]), `habitat.py` (well-mixed closed-volume ODE per §5.9 with scipy `solve_ivp`; O₂ consumption by Huggett; CO₂ from stoichiometry; CO via yield; time-to-limit using `limits.yaml`).
- **Subagent D:** `uq.py` (seeded Monte Carlo, N = 1000, over property distributions and parameter covariance → p05/p50/p95), `validity.py` (per-feature min/max envelope + nearest-neighbor distance in standardized input space), `io.py` (ModelResult dataclass, yaml loaders, JSON export).

`properties.yaml` starts with the candidate values in PRD §5.2 (PMMA, cellulose/cotton, SIBAL areal density ≈ 136 g/m² cotton from 52 g over 94 × 40.6 cm, n-heptane, methanol, n-decane), each with a source and `TODO_VERIFY` where you aren't certain. `missions.yaml`: ISS (21%, 101.3 kPa), Orion (21%, 101.3), Challenge-spec Moon Base (30%, 70.3 kPa), Lunar Habitat/Rover/Mars EA (34%, 56.5 kPa), each with a free-volume placeholder flagged `TODO_VERIFY` plus a source to check. `limits.yaml`: NASA SMAC values for CO₂ and CO **looked up from NASA JSC SMAC documents with a citation**; if you can't access them, `TODO_VERIFY`.

**Tests (must pass):** analytic limits (Z_st and T_f monotonic in Y_O; K increases with Y_O; V_f,thin ∝ 1/d; V_f,thick ∝ V_g; u_b ∝ g^{1/3}; habitat with Q = 0 stays constant; with h_w = 0, ΔP/P = ΔT/T; suppression: more diluent → lower T_ad; the agent ranking under pure thermal theory per mole is CO₂ > N₂ > He, as expected from heat capacity); units round-trip; ModelResult schema.
Commit: `phase1: physics core`. **Then tell the human to start Claude Code session 2 with Phase 3 (web).**

## Phase 2 — Data pipeline and calibration (≤ 6 h, overlaps human digitizing)
Priority order (stop and ship when the time-box ends):
1. **FLEX:** download NASA/TP-2015-216046 (NTRS 20150023456) and extract the Appendix A per-test tables with pdfplumber into `test_point` rows (fuel, d₀, x_O₂, diluent and fraction, P, outcome/extinction type, d_ext, K where given). Validate the column parsing on 10 rows against the PDF; record page numbers as `locator`. Mark `verified = false` until the human checks (write a 20-row sample to `docs/HUMAN_TASKS.md` for spot-check sign-off; after sign-off set the extracted batch verified, and keep the spot-check record).
2. **FLEX LOIs** (paper DOI 10.1007/s12217-014-9372-2): the summary validation targets V1–V4.
3. **BASS-II, Saffire, BRE, SAME-R:** for values in text or tables, use `extract_llm.py` (Claude with a strict JSON schema; each value needs a page plus a short supporting snippet). For values only in figures, create `physics/data/digitized/README.md` listing *exactly* which figures to digitize with WebPlotDigitizer (paper, figure number, axes, units, output CSV name), add them to `HUMAN_TASKS.md`, and ingest the CSVs when they appear (`digitized = true`, ±5% uncertainty).
4. `normalize.py` → SI + p_O₂ + y_O₂; `split.py` → grouped train/test split by test campaign (seeded); `build.py` → parquet + coverage report (`docs/STATUS.md`).
5. **Calibration** (`fit/`): droplet (effective k_g factor, critical Da, critical radiative-loss fraction), suppression (µg T_crit fitted to FLEX LOIs; 1 g T_crit from a sourced literature value), spread (cₚ/T_f factor and F(Da) per material class), habitat (h_w·A_w on one Saffire flight). Save params + covariance to `physics/data/processed/params/*.json`.
6. **Validation** (`validate/run_all.py`): compute V1–V10 per PRD §5.11 on the **test split / held-out sources**; write parity data, metrics (RMSE, MAPE, bias, n; AUC and Brier for classifiers), and pass/fail to `web/data/validation/*.json` and `docs/VALIDATION.md`.
7. `make vectors`: 200 random in-envelope input sets per closed-form model → `shared/golden_vectors.json`.

Fallbacks if time runs out: a model with no validation data yet still ships, marked "Uncalibrated — theory only" in the UI. Never fabricate a validation pass.
Commit: `phase2: data + calibration + validation`.

## Phase 3 — Web app (session 2; ≤ 8 h; starts after Phase 1 commit)
1. Scaffold `web/` (Next.js App Router, TS strict, Tailwind, shadcn/ui). Dark mission-control theme, accent #FF6B35, Inter + JetBrains Mono, colorblind-safe palette.
2. `lib/missions.ts` + Zustand store + URL sync → the **Mission Bar** (preset, O₂ %, pressure, gravity, ventilation flow, free volume).
3. `lib/physics/*.ts`: port thermo, flame_temp, spread, gravity, droplet, suppression, habitat (RK4 or simple adaptive stepping is fine), and smoke; load params from `web/data/params`. **Vitest:** reproduce `shared/golden_vectors.json` (rtol 1e-6; for the ODE, rtol 1e-3 against Python). Monte Carlo UQ in TS with seeded PRNG (mulberry32) and N = 500 for interactivity.
4. Pages per PRD §8, in this order (ship each before starting the next):
   1. `/console`: Plotly flammability map (x = flow cm/s, log; y = O₂ % with a toggle to p_O₂ kPa), PSI points (● burn / ✕ extinct, symbol per investigation, hover with source), mission crosshair, model boundary band (from boundary grid JSON when available, else the spread-model quench/blowoff estimate), and a gravity toggle µg/Moon/Mars/1 g that moves the mission point to its equivalent flow. Cards for spread, suppression, habitat mini-chart and smoke, each with an ⓘ drawer (KaTeX equation, inputs, assumptions, validation metric, sources, extrapolation badge).
   2. `/models/[id]`: a full calculator per model with sliders, uncertainty bands, equations and an "Export report (Markdown)" button.
   3. `/validation`: the V1–V10 table with pass/fail chips; per-model parity plots + metrics + data rows with source links.
   4. `/evidence`: relevance ranking (PRD v1 formula: atmosphere match, flow match, fuel realism, scale, pillar, data richness; editable weights; breakdown tooltips), investigation cards (all 8 fields), compare view, data table with CSV/JSON export carrying provenance.
   5. `/` Mission Brief (hook, picker, 3 headline outputs computed live for the mission).
   6. `/gaps`: coverage heat map, conflicting-evidence list (include He vs CO₂), experiment-designer output (Tier B).
   7. `/implications`, `/earth` (Tier B), `/methods`.
5. Persistent caveat banner on console, models and agent: "PSI contains microgravity and 1 g data only; partial-gravity values are bounded estimates."
6. Playwright smoke tests: every route renders; mission change updates the console; export downloads; validation table renders. Lighthouse performance ≥ 90 on `/`.
Commit per page: `web: <page>`.

## Phase 4 — AI agent (≤ 3 h)
- `app/api/ask/route.ts`: Anthropic SDK, model `claude-sonnet-5-5`, streaming, tool use. The tools are those listed in PRD §7, implemented over the same TS physics and data (deterministic, zod-validated inputs).
- `lib/ai/system.md` with the PRD §7 rules. The UI shows a collapsible **tool-call trace** ("Ran run_spread(x_o2=0.34, P=56.5 kPa, …) → 3.1 mm/s [p05–p95 2.2–4.4]"), citation pills `[S:id]` → source, model pills `[M:id]` → `/models/id`.
- `lib/ai/guard.ts`: extract numbers from the answer, check each against the tool outputs (with rounding tolerance); on failure regenerate once, else drop the sentence and append "(removed unsupported claim)".
- Demo mode: run the 12 golden questions (PRD §11) at build time with a script, cache to `web/data/cache/*.json`, and serve the cache when `DEMO_MODE=1` or the API fails. Vitest: guard unit tests; a golden-question test that checks required tool calls and citations appear.
- Rate limit by IP; keys server-side only; footer "AI-generated from cited tools and sources; verify before engineering use."
Commit: `phase4: agent`.

## Phase 5 — Tier B (only if Tier A is green by Sunday 12:00; ≤ 4 h total)
- `boundary.py`: physics-informed features (θ = T_f/T_crit, ln Da, radiative-loss number, ln thickness, material class; gravity via equivalent flow); L2 logistic regression (show coefficients) + GP classifier (RBF + White). Grouped CV by investigation; AUC, Brier, calibration curve; export a probability grid to JSON (O₂ 12–45%, flow 0–60 cm/s, g ∈ {0, 0.165, 0.378, 1}, P ∈ {56.5, 70.3, 101.3} kPa).
- Experiment designer: from the GP posterior, pick the top-10 points by predictive entropy (or BALD) within feasible rig limits (document the rig ranges as `TODO_VERIFY` with sources), and generate a cited proposal via the agent.
- `smoke.py` fit to SAME/SAME-R aging data (V10) plus the console card.
- `/earth` page with ≥ 4 cases, each running a model (e.g. O₂-enriched hospital room, submarine, aircraft cabin, mine).

## Phase 6 — Ship (≤ 2 h, must finish by Sunday 18:00)
- Deploy `web/` to Vercel (`ANTHROPIC_API_KEY`, `DEMO_MODE` fallback). Verify the production URL in a fresh browser with the API key removed.
- `README.md`: one-liner, GIF placeholder, what it does, the physics (equation list with references), validation summary table (auto-copied from `docs/VALIDATION.md`), data provenance, how to run (`make all`, `pnpm dev`), `pip install git+…#subdirectory=physics`, limitations, license, credits, an explicit "Use of AI" section (Claude API at runtime; built with Claude Code), and the full References list (PRD §15 + every library).
- `CREDITS.md`: every NASA image/video with its URL and public-domain note.
- Final `docs/STATUS.md`: what's done, what's Tier B/C, known limitations.

## Human tasks you must surface early (put them in docs/HUMAN_TASKS.md at Step 0)
1. Confirm every teammate is registered for the same event (submission blocker).
2. Register on psi.nasa.gov if downloads need an account; download one raw BASS-II or Saffire dataset into `physics/data/raw/psi/`.
3. Digitize the figures you list (WebPlotDigitizer), ≤ 2 h total.
4. Spot-check 20 extracted FLEX rows and sign off.
5. Science checker: review `properties.yaml`, `limits.yaml`, every equation in `/methods`, and every caveat.
6. Provide `ANTHROPIC_API_KEY` and the Vercel account.
7. Record the 30-second video on production (script in PRD §13).

## Definition of done (Tier A)
- `make all` runs clean from a fresh clone (with raw files present); pytest and vitest green; `pnpm build` green; Playwright green.
- Validation Lab shows V1–V9 with honest pass/fail and parity plots; ≥ 400 verified PSI test points from ≥ 4 investigations.
- Console, models, evidence, validation and the agent all work on the production URL, including in demo mode with no API key.
- No hard-coded science values outside data files; every displayed number traces to a source or a model run.

Begin with Step 0 now. After each phase, print a 5-line status (done / failing / time used / next / human blockers), and continue straight to the next phase unless a human blocker stops you.
