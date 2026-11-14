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
