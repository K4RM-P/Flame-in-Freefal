# Status

## Phase 1 — physics core: DONE
emberphys: thermo (GRI-Mech 3.0 NASA-7), flame_temp (Burke–Schumann), droplet (d²-law + dual extinction + LOI),
suppression (critical adiabatic flame temperature), spread (de Ris thin/thick + F(Da)), gravity (u_b mapping),
habitat (well-mixed ODE), smoke (Smoluchowski), uq (seeded MC), validity (envelope + NN distance), models (ModelResult API).
16 pytest tests (analytic limits, units, schema) pass.

## Phase 2 — data, calibration, validation: PARTIAL
- FLEX Table IX extracted from NASA/TP-2015-216046: 276 rows, 275 verified (visual spot-check, 0 mismatches; human countersign pending).
  81 tests carry an author-stated extinction mode from Appendix B captions.
- Investigations with verified rows: **1 (FLEX)**. PRD R2 target (≥400 rows from ≥4 investigations) **not met**: BASS-II, Saffire,
  BRE and SAME-R values exist only in figures and need human digitization (docs/HUMAN_TASKS.md #3).
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

## Adopt-ideas phase (2026-11-14, feature/adopt-ideas) — DONE
Plan and per-item commits: docs/ADOPTION_PLAN.md. Every feature passed pytest, vitest, `next build` and Playwright (with axe) before the next began.
- **PSI live data (B1, B2):** `fetch_psi.py` (25 combustion accessions: metadata, DOI, listings, 25 small files, sha256 manifest; cache-first) and
  `ingest_psi.py` (2,818 rows from 18 accessions; BASS-II, BASS + As-Run, SAFFIRE-I/II/III, SAME-R, BRE and SPICE normalized; others raw).
  All PSI rows verified=false pending the spot-check in HUMAN_TASKS. PSI-69 cross-check of the FLEX extraction: 1,533 values, 0 mismatches.
- **Earth test vs orbit (B3):** 7 like-for-like SAFFIRE-II samples (4 less flammable in orbit, 3 same, 0 worse), linked from the Console verdict.
- **Exploration atmosphere (B4):** ACME BRE PSI-20 on 34 % O₂ presets; pressure match not claimed (not in the PSI table).
- **Detection (B5), design suggestions (B7), suppression framing (B6), compliance (B8), compare diff (A3), settling SM4 (A2).**
- Validation: no new held-out model points (no ingested table matches a model output under matching inputs); V6–V10 still pending, reasons in VALIDATION.md.
- Not done / deferred: NASA imagery, Saffire Table 2 flame sizes, 1-D transport-time model, answer-style toggle, PSI-21/PSI-106 files (API HTTP 500).
- Lighthouse 12.2.1 (local `next start`, default mobile throttling, first measurement, so no earlier baseline): `/` perf 42 · a11y 100 · best-practices 96 · SEO 90; `/console` 53 · 98 · 96 · 90; `/evidence` 71 · 96 · 96 · 100. Performance is the weak spot (Plotly + KaTeX bundles); not addressed in this phase.
- Final gate: `make all` (data → fit → validate → vectors → export → test) reproduces every committed artifact; pytest 21, vitest 29, `next build` OK, Playwright 41 passed / 3 skipped (axe serious = 0 on audited pages).

## Product cohesion pass (2026-11-14) — product lane
- IA collapsed to Review / Evidence Library / Methods & Validation; old routes redirect (next.config.mjs).
- `web/lib/contracts` (Zod mirrors of the data contract) + `web/lib/review` (pure `buildReview`, verdict rules in `rules.ts`).
- Review screen `/review`: verdict, Q1–Q3 with receipts, hero map, Earth vs orbit, actions + next test, evidence used, Export Evidence Brief (print→PDF + Markdown).
- Without materials.json the Review shows an honest "Data pending" state (no mock numbers).
- Next steps (skipped, time-box): cabin comparison mode (ISS vs Lunar side by side), Lighthouse tuning, new animations, after-cohesion screenshot set, full README rewrite.
