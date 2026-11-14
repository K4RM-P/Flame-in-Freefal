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
