# Status

## Phase 1 — physics core: DONE
emberphys: thermo (GRI-Mech 3.0 NASA-7), flame_temp (Burke–Schumann), droplet (d²-law + dual extinction + LOI),
suppression (critical adiabatic flame temperature), spread (de Ris thin/thick + F(Da)), gravity (u_b mapping),
habitat (well-mixed ODE), smoke (Smoluchowski), uq (seeded MC), validity (envelope + NN distance), models (ModelResult API).
16 pytest tests (analytic limits, units, schema) pass.

## Phase 2 — data, calibration, validation: PARTIAL
- FLEX Table IX extracted from NASA/TP-2015-216046: 276 rows, 275 verified (visual spot-check, 0 mismatches; human countersign pending).
  81 tests carry an author-stated extinction mode from Appendix B captions.
- Investigations with verified rows: **9** (see DATA CHECKPOINTS). Correction: an earlier version said the BASS-II, Saffire, BRE and SAME-R
  values exist only in figures. That was wrong. PSI publishes an Experimental table (CSV) for each, and they are parsed row by row (docs/DATA_AUDIT.md).
- Calibrated: droplet (f_k, C_D, a_eff per fuel), suppression (µg T_crit per fuel). Uncalibrated (theory only): spread, habitat, smoke.
- Validation: V2, V4, V5 pass (droplet); V3, V4 pass (thermal suppression, held-out); V1, V3 fail (heptane droplet LOI);
  He LOIs fail in both models (documented evidence gap); V6–V10 pending data.
- Time-box note: freeing the Burke–Schumann f_T factor in the droplet fit did not improve heptane; reverted to the 2-parameter fit.
- Tier B boundary (U7) / experiment designer (U9): not built — no burn/extinct solid data yet.

## Phase 3 — web: DONE
Pages: / (brief), /console, /models/[spread|droplet|suppression|gravity|habitat|smoke|boundary], /validation, /evidence, /gaps,
/implications, /earth, /ask, /methods. Mission Bar synced to URL. Vitest: golden vectors (thermo, flame temp, droplet incl.
extinction roots, suppression, spread, gravity, smoke at 1e-6; habitat ODE at 1e-3). Playwright: 22 smoke tests pass.
Deviation: shadcn/ui not used (plain Tailwind components) to keep dependencies minimal. Lighthouse not yet measured.

## Phase 4 — agent: DONE (offline-verified)
/api/ask: Anthropic SDK tool-use loop (claude-sonnet-5-5), 16 deterministic zod-validated tools, NDJSON streaming of the
tool trace, numeric guard (regenerate once, then strip), IP rate limit, demo mode. No API key was available during the build,
so the 12 golden answers in web/data/cache/golden.json are offline compositions from tool outputs (labelled in the UI);
run `pnpm demo-cache` with a key to replace them with live answers. The live path is untested against the real API.

## Phase 5 — Tier B: PARTIAL
- /earth with 4 model-backed cases: done. Smoke module + card: done (uncalibrated).
- Boundary (U7) and GP experiment designer (U9): NOT built — no solid burn/extinct data. /gaps ships a coverage-based proposal heuristic instead, labelled as such.

## Phase 6 — ship: PENDING HUMAN
Vercel deploy needs the team's Vercel account and ANTHROPIC_API_KEY (HUMAN_TASKS #6). README, CREDITS, STATUS written.

## Known limitations
See README "Limitations" and docs/VALIDATION.md. Biggest gaps: only FLEX data verified; heptane droplet LOI under-predicted; He effect not captured.

## UI phase (2026-11-14/15) — design lead pass
Done: LCH-derived tokens (dark + warm-ivory/print), ui-kit (`web/components/ui-kit`, `/kit`), motion tokens, Okabe–Ito palette, plot theme,
Linear-style shell (top bar + Mission Search Pill with popovers/histograms, collapsible rail, caveat line, ⌘K palette, `?`/`/`/single-key
shortcuts, right drawers), Console (verdict sentence, map with gravity ghost + dimension line, lasso export, role-ordered result stack,
receipts, scenario A/B, implications strip), `/start` 3-step setup, landing (mesh hero, live mini-console, problem, Maya, bento,
equation-as-proof, stats, ladder), Validation Lab (accuracy/precision/reliability dials, scoreboard, parity + residuals, LOI curves),
Gaps "Draft proposal" → Ask, Ask drawer (role-aware suggestions, thinking state, trace with ms, Open in Console, Copy with sources),
Presentation Mode (`?present=1`), docs/VIDEO_SHOTLIST.md, docs/ui-audit/{AUDIT,CHANGELOG,JUDGE_CHECK}.md, before/after screenshots.
Tests: pytest 16, vitest 26, Playwright 31 (story path, 10 receipt spot-checks, axe serious = 0 on /, /console, /validation, /start, 390 px no overflow).

Honesty decisions:
- Verdict states spread (theory-only) and "Burn probability: ∅ not available" — there is no boundary model, so no p value is shown.
- Equation-as-proof uses V5 (d²-law K, passes) instead of V6 (pending data); V6 is not shown as ✓.
- Suppression card shows the 1 g reference for solids; µg-calibrated T_crit exists only for n-heptane/methanol and is shown as such.
- Reliability dial is 20 %: K bands carry only property + f_k uncertainty and are overconfident for single tests; stated on the page.

Not done / simplified (time-box):
- Model pages keep the earlier template (restyled, receipts added); no grouped inputs with histograms, no sensitivity tornado/Web Worker.
- Evidence keeps one scrolling view (no Table/Gallery/Board switch, no TanStack virtualization, no filter sheet live count).
- Units toggle (SI ↔ engineering) not built; psia shown alongside kPa where it matters.
- Lighthouse not measured; Vercel deploy pending account access (HUMAN_TASKS #6). Story path not yet run on production.

UI requests (cannot be derived honestly from existing outputs):
- Artemis II smoke-alarm line (PRD §13): needs a citable source before it appears on the landing or video.
- Burn probability at the mission point: needs U7 boundary model (digitized solid-fuel outcomes).
- NASA flame imagery: none bundled yet; add with credits in CREDITS.md.
- CSA: no CSA-sourced data in web/data, so no CSA data credit is shown.

## Product cohesion pass (2026-11-14) — product lane
- IA collapsed to Review / Evidence Library / Methods & Validation; old routes redirect (next.config.mjs).
- `web/lib/contracts` (Zod mirrors of the data contract) + `web/lib/review` (pure `buildReview`, verdict rules in `rules.ts`).
- Review screen `/review`: verdict, Q1–Q3 with receipts, hero map, Earth vs orbit, actions + next test, evidence used, Export Evidence Brief (print→PDF + Markdown).
- Without materials.json the Review shows an honest "Data pending" state (no mock numbers).
- Next steps (skipped, time-box): cabin comparison mode (ISS vs Lunar side by side), Lighthouse tuning, new animations, after-cohesion screenshot set, full README rewrite.

## DATA CHECKPOINTS
- **CP1 (2026-11-14, feature/psi-data, data lane).** PSI fetch extended: 277 files, sha256 manifest, retry/backoff. Contract layer `physics/pipeline/contract.py`
  writes 410 verified PSI rows: BASS-II PSI-25 155 · BASS PSI-26 122 · SAFFIRE-I PSI-98 2 · SAFFIRE-II PSI-99 10 · SAFFIRE-III PSI-100 2 ·
  SAME-R PSI-101 109 · SAME PSI-102 8 · DAFT PSI-47 2. Plus 275 FLEX rows: 685 rows in `web/data/test_points.json`.
  New files: `materials.json` (15), `earth_vs_orbit.json` (7 SAFFIRE-II rows: 4 orbit_better, 3 same, 0 orbit_worse), `evidence_index.json`,
  `boundary.json` (`available: false`, reason inside), `provenance.json`. `investigations.json` now carries accession, psi_id, doi,
  psi_investigation_url, title/objective_official, files_used (sha256) and n_verified_rows. Schemas are in `shared/contracts/` and checked in `make test`, along with
  `trace_ui_numbers.py`.
  **Notes for the product lane:**
  1. `outcome` is null on smoke and aerosol rows.
  2. FLEX keeps `diffusive_ext` / `radiative_ext`.
  3. PSI rows have null `K_mm2_s`, `d0_mm` and `diluent`.
  4. `web/lib/ai/tools.ts` still says "verified points are FLEX droplets only". That is now stale.
  5. `earth_vs_orbit.json` is a root array (counts in processed/contract/earth_vs_orbit_meta.json).
  6. `evidence_index.json` is a record: material_key → {Q1,Q2,Q3: [{investigation, why, source, n}]}.
  7. `web/lib/contracts` Zod still differs from §2 in three places: files_used objects, forms objects, and nullable x_o2/pressure_kpa/outcome. The product lane has been notified.
  The SAME-R/SAME smoke model port (SM4 settling) and the golden vectors come with this data push (web/lib/physics, data lane).
