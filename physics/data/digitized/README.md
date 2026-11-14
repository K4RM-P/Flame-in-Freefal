# Figures to digitize (WebPlotDigitizer) — unlocks V6-V10

Save each as CSV here with the given name. Columns exactly as listed; one row per point. Mark nothing as verified;
the pipeline sets `digitized = true` with ±5% uncertainty. Include the figure number in the file header comment.

| # | Paper | Figure | Axes (x, y) | Units | Output CSV | Unlocks |
|---|---|---|---|---|---|---|
| 1 | BASS-II, Sci. Rep. 2017 (doi:10.1038/s41598-017-18398-4) | opposed spread rate vs flow, PMMA (each O2 series) | flow, spread rate (+ series O2) | cm/s, mm/s | `bass2_spread_vs_flow.csv` (flow_cm_s, spread_mm_s, x_o2, geometry, diameter_mm) | V7, spread F(Da) fit |
| 2 | BASS-II, Sci. Rep. 2017 | flammability map O2 vs flow (burn / extinct markers) | flow, O2 | cm/s, % | `bass2_flammability.csv` (flow_cm_s, x_o2, outcome, gravity_g) | V6, boundary |
| 3 | Saffire IV-V, NTRS 20210011521 | vehicle pressure, temperature, CO2 vs time (each flight) | time, value | s, kPa/°C/ppm | `saffire_vehicle_<flight>.csv` (t_s, P_kPa, T_C, co2_ppm, hrr_kw if shown) | V9, h_w fit |
| 4 | Saffire I-III, NTRS 20180005168 | SIBAL spread rate at 20 and 25 cm/s | flow, spread | cm/s, mm/s | `saffire_sibal_spread.csv` | V7 (scale) |
| 5 | ACME BRE, Dehghani 2021 | steady vs extinct outcomes vs O2 | O2, outcome | %, - | `bre_outcomes.csv` (x_o2, outcome, t_ext_s) | V8 |
| 6 | SAME-R, Aerosol Sci. Tech. 2015 | mean particle diameter vs aging time per material | aging time, diameter | s, nm | `same_r_aging.csv` (material, aging_s, d10_nm, d43_nm) | V10, smoke fit |
