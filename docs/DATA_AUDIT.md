# Data audit — NASA PSI combustion data in EmberAtlas

Owner: data lane (`physics/`, `shared/`, `web/data/**`). Generated artifacts are reproducible with `make data fit validate export`.
Last updated: 2026-11-14 (CP1).

## 1. What was fetched

All requests were GETs to the public PSI API (`https://psi.nasa.gov/geode-py/ws`), cache-first, through
`physics/pipeline/fetch_psi.py`:

- metadata for all public investigations (`/api/investigations/metadata`), with the title and objective of each of the 25 combustion accessions
- the DOI of each accession (`/repo/investigations/PSI-{ID}?fields=accession,doi`). Each DOI resolves to `https://psi.nasa.gov/physci/repo/data/investigations/PSI-{ID}` (checked by HTTP redirect on PSI-25), and that URL is shipped as `psi_investigation_url`.
- the file listing of each accession (`/api/investigations/files/search/{ID}?page=1`)
- 277 files, each under 25 MB. The fetcher never downloads zip, mp4, mov, avi or tif files. It retries with backoff 3 times; if a file still fails, it writes the exact file name and URL into `docs/HUMAN_TASKS.md` and continues. No file has failed so far.

The cache lives in `physics/data/raw/psi/` (gitignored). The manifest (accession, file, category, bytes, sha256, url,
fetched_at) is in `physics/data/processed/psi_catalog.json` (committed) and in `web/data/psi_catalog.json`.

Files that the contract rows are built from (full sha256 in the manifest):

| accession | file | bytes | sha256 (first 16) | contract rows |
|---|---|---:|---|---:|
| PSI-25 | PSI-25_Experimental table_BASS-II.csv | 16590 | `71e792bf6b5fb5ea` | 155 |
| PSI-25 | PSI-25_Reference Data_Fan calibration data.xlsx | 23973 | `bc0dca3efdef44a7` | (calibration) |
| PSI-26 | PSI-26_Experimental table_BASS.csv | 4726 | `ccfc3c54d948b64a` | 122 |
| PSI-26 | PSI-26_Science Documents_As Run_Test Matrix.xlsx | 111886 | `850910541fc9c802` | (joined) |
| PSI-98 | PSI-98_Experimental table_SAFFIRE-1.csv | 469 | `c01f29c62455f0a3` | 2 |
| PSI-99 | PSI-99_Experimental table_SAFFIRE-2.csv | 1973 | `3c24390b9ef86f3d` | 10 |
| PSI-100 | PSI-100_Experimental table_SAFFIRE-3.csv | 239 | `4d3c717ec20dd024` | 2 |
| PSI-101 | PSI-101_Experimental table_SAME-R.csv | 5674 | `87164b7dc9168a42` | 109 |
| PSI-101 | PSI-101_Analyzed Data_SAME, SAME-R_Results.xlsx | 4061669 | `6d3a539ccf425b1f` | (smoke measures) |
| PSI-102 | PSI-102_Experimental table_SAME.csv | 331 | `268d1e121d2f211b` | 8 |
| PSI-47 | PSI-47_Experimental table_DAFT.csv | 518 | `d9d1a436c6e7bbc4` | 2 |
| PSI-47 | PSI-47_Analyzed Data_DAFT Retrieved Data Summary.xls | 1004032 | `a5c23d302f076de6` | (dust measures) |
| PSI-69 | PSI-69_Experimental table_FLEX.csv | 24776 | `37c88ce8ae9391b7` | 275 FLEX rows cross-checked |
| PSI-20 | PSI-20_Experimental table_ACME BRE.csv | 1113 | `4aa5d3f98708ceac` | (BRE summary) |

Also cached for the science tasks: the SAFFIRE-I and SAFFIRE-III vehicle and Saffire telemetry (PSI-98 "Telemetry Data Good Process Version.xlsx"; PSI-100 "Raw telemetry file.csv", "Saffire_Data_Table2017.161.00.42.03-EU.csv" and "Saffire-III Telemetry Data.xlsx"), SAFFIRE-II "Sensor Data Sample 1.xlsx", the PSI-101 analyzed per-run xlsx files under 1 MB, the PSI-102 test logs, the PSI-47 P-Trak/DustTrak txt and xls files, and the PSI-20 per-test-point TP, as-run and comment txt files.

**STATUS correction.** An earlier STATUS.md said the BASS-II, SAFFIRE, BRE and SAME-R values "exist only in figures". That was
wrong. PSI publishes an Experimental table (CSV) for each of them, and those tables are now parsed row by row.

## 2. Rows per accession (contract, `web/data/test_points.json`)

| accession | investigation | rows | verified | outcomes |
|---|---|---:|---:|---|
| PSI-25 | BASS-II | 155 (129 tests + 26 extinction-phase rows) | 155 | burn 126 · extinct 27 · no_ignition 1 · unknown 1 |
| PSI-26 | BASS | 122 | 122 | burn 91 · extinct 11 · no_ignition 11 · unknown 9 |
| PSI-98 | SAFFIRE-I | 2 | 2 | burn 2 |
| PSI-99 | SAFFIRE-II | 10 (9 samples; 2-7 split into its PMMA and Nomex parts) | 10 | burn 5 · insignificant 4 · no_ignition 1 |
| PSI-100 | SAFFIRE-III | 2 | 2 | unknown 2 (the table has no outcome column) |
| PSI-101 | SAME-R | 109 | 109 | smoke tests (outcome null) |
| PSI-102 | SAME | 8 | 8 | smoke tests (outcome null) |
| PSI-47 | DAFT | 2 | 2 | nuisance-aerosol sessions (outcome null) |
| PSI-69 / NTRS | FLEX | 275 | 275 | carried over (droplets); cross-checked against the PSI-69 table: 1,533 values, 0 mismatches |

PSI investigations with verified rows: **9**. Seven come from the new contract rows (PSI-25, 26, 98, 99, 100, 101, 102) plus DAFT (PSI-47) and FLEX (PSI-69).

## 3. Parsing decisions and flags (every one is a row flag; none is silent)

Locator format: `<file>#row<n>`, where n is the 1-based line in the CSV (header = row 1). For xlsx: `<file>#<sheet>!row<n>`.

### BASS-II (PSI-25)
- **Flow.** Converted only through the PSI-25 fan calibration sheet, cell A33: `*U =1.0066(AIR)`, so flow = 1.0066 × Air display. "Fan display" is a fan setting and is never converted. When a row has no Air-display reading, flow is null and the row is flagged `fan_display_uncalibrated` (12 rows).
- **Air-display cells contain mixed text.** Numbers inside parentheses and numbers right after `pot`/`pots` are fan-pot settings, not speeds. When an explicit `X cm/s` appears, that value wins (`air_display_explicit_cm_s`). In one cell (O13a) the fan values sit outside the parentheses and the air values inside; it is detected because every bare number is ≥ 38 (the fan range on the calibration sheet) and is flagged `air_fan_values_swapped_in_cell`.
- **Material, thickness and width** are parsed from free text ("100 micron PMMA film 2 cm wide", "1/4" clear rod"): micron → mm, inch → mm (25.4, by definition). Rods and four Bhattacharjee films are not named as PMMA in their cell. Other rows on the same sheet name identical samples "clear pmma rod" or "pmma film", so these get `material_key = pmma` with the flag `material_inferred_from_sheet` (106 rows across BASS-II and BASS).
- **"Total Frames Shot" = "none"** means no recorded burn: outcome `unknown`, flag `no_frames_recorded` (B2).
- **CO** is kept raw. Negative values are a sensor offset: flag `negative_CO_offset` (14 rows). CO is never used as a physical quantity.
- **O₂.** The initial O₂ is the test condition (`x_o2` = `x_o2_initial`); the final O₂ is stored as `x_o2_final`. Final values that are physically impossible (e.g. 40.4 %, 0.6 %, 39.1 %) are flagged `o2_final_implausible_in_source` and left as they are.
- **Pressure** is not in the table, so it stays null and so does `p_o2_kpa`. % O₂ is never compared across pressures.
- **PI names** (Bhattacharjee, Ferkul, Miller, Olson, Fernandez-Pello, T'ien) are stored as `sub_campaign`.
- **Outcomes.** One row per test at the ignition condition (initial O₂, first air reading): `no_ignition` if the text says "no ign"; `extinct` if "would not stay lit"; otherwise `burn`. If the fan or air text then reports extinction (`ext`, `extinguished`, `out`, `off`, `blowoff`), a second row with `phase = extinction` is emitted (26 rows). Its flow is the last air reading only when the cell is a plain list. "down to ext", "decr" or "low" → flow null, `extinction_flow_below_last_listed`. Pot units → `extinction_flow_in_fan_pot_units`. Blowoff → `blowoff_flow_not_tabulated`.

### BASS (PSI-26)
- Experimental-table rows are joined to the As-Run matrix on (As-run no., Test no.), never on the as-run number alone, because as-run numbers 24, 85, 89, 90 and 91 each occur twice for different samples. One row has no match: `no_as_run_match`.
- O₂ comes from As-Run "O2 % by volume", which is stored as a fraction. Pressure comes from "pressure, atm" × 101.325.
- **Flow.** BASS has no calibration of its own; the PSI-25 sheet belongs to BASS-II days and hardware. Flow is therefore taken only from an explicit "X cm/s" in the flight observation text (`flow_from_observation_text`, 20 rows). Otherwise flow is null (`air_display_uncalibrated`) and the raw Air display is kept.
- **Outcome** comes from the observation text, checked in this order:
  1. `unknown`: igniter broke before ignition, or no useful data
  2. `extinct`: brief ignition then went out, self-extinguished, winked out, went out when the igniter was retracted
  3. `no_ignition`: did not ignite, no ignition, no joy, no luck
  4. `burn`: any ignition, flame, soot or spread wording, or "did not blow out"

  The full observation text is kept as `outcome_raw`, and the matched rule as `outcome_rule`.
- **Hand check of 10 joined rows against the xlsx** (As-Run rows 9, 16, 21, 29, 30, 31, 32, 49, 82, 109): O₂, pressure, material and observation all matched after the join fix.

### SAFFIRE-I/II/III (PSI-98/99/100)
- The F1C1/F1C2 and F2C1/F2C2 rows are pre-test flow visualization and are excluded. Note rows are excluded too.
- SAFFIRE-I O₂ "21.5 - 21.7" is stored as min, max and mid (`x_o2` = mid). "~ 21.5" sets `approx = true`.
- **SAFFIRE-I thickness.** The header says "Sample Thickness (cm)" with the value 0.37, which gives 3.7 mm and is stored as tabulated. It is flagged `thickness_inconsistent` because SAFFIRE-II lists the same SIBAL as "037 mm". SAFFIRE-I length and width (40.6, 94) are also in the opposite order from SAFFIRE-III (`length_width_order_differs_from_saffire_iii`).
- **SAFFIRE-II.**
  - "037 mm" is read as 0.37 mm (`thickness_leading_zero_restored`).
  - Units sit inside the cells ("29 cm", "20 cm/s", "80 W", "9.2 s") and are stripped.
  - The mojibake header "?-g" means µg.
  - Outcomes are categorical: "Complete" → burn over the full length; "~ 0" → insignificant; Burn Time "Insignificant" → insignificant; "n/a" → no value; "Acceleratory" is a 1-g spread category kept raw.
  - The µg columns (burn length, spread) and the 1-g columns (burn length, spread rate) are different quantities and are never mixed. The µg "Spread Length" column holds mm/s values (`ug_spread_column_header_says_length_value_is_rate`).
  - Sample 2-7 "PMMA & Nomex" is split into its two parts (`composite_sample_component`). Note 2 sets the Nomex part to `no_ignition`.
  - 2-8 "See Fig. 5" → thickness null (`thickness_not_tabulated`). 2-8 "~ 10 cm (note 3)" is visible damage (`burn_length_is_visible_damage_note_3`).
  - Samples 2-6 and 2-9 have a blank material cell, so `material_key` is null (`material_blank_in_source`). They are not inferred.
- **SAFFIRE-III.** ".33 cm" is stored as 3.3 mm and flagged `thickness_inconsistent` (not silently fixed). The table has no O₂ and no outcome, so both are null or unknown (`o2_not_in_table`, `outcome_not_in_table`).
- Pressure is not in any SAFFIRE table (null).

### SAME-R (PSI-101), SAME (PSI-102), DAFT (PSI-47)
- SAME-R rows like "51a" are aged repeats: `repeat_of` points to the base test of the same material (`aged_repeat`, 42 rows). Test numbers repeat across materials (57 Lampwick / 57 Teflon), so row ids include the material. `aging_s` = "Net aging time (sec)" (the transport time).
- SAME rows 5–8 say "same conditions as 1-4". Their conditions are not copied over (`conditions_by_reference_to_rows_1_4`). Aging is converted from minutes to seconds (`aging_converted_from_minutes`).
- DAFT rows are sessions with nuisance aerosol (Arizona Road Dust, Velcro area), not smoke: `material_class = nuisance_dust`, `nuisance_aerosol_not_smoke`.
- Smoke and aerosol rows have `outcome = null` (they are not burn tests).

### O₂ basis
Every row stores `x_o2` and `pressure_kpa`. `p_o2_kpa` is filled only when the pressure is tabulated (BASS, FLEX), so % O₂ is never compared across pressures without p_O₂.

## 4. Verification

1. **Automated re-read** (`physics/pipeline/contract.py: reread_check`). Every contract row's locator line is re-read with Python's `csv` module, independently of pandas. Each numeric field is re-derived from its own cell: BASS-II O₂ initial and final; SAFFIRE flow and length; SAME-R aging, inlet velocity and duration; SAME flow and aging. The material text must appear verbatim in the raw line. Result: **1,087 checks, 0 mismatches** (`physics/data/processed/contract/verification.json`, asserted in `make test`).
2. **Manual comparison** (`physics/data/processed/contract/manual_check.json`). For each table, 20 seeded rows (all rows when a table has fewer than 20) were compared by Claude Code against the raw line. The first pass found 7 discrepancies, all parser bugs, fixed before sign-off:
   - BASS-II B20 film parsed as a slab
   - BASS-II P4 flow taken from a pot value
   - BASS observation column not matched, so every outcome was unknown
   - two BASS outcome-rule gaps ("wake ign … soot", "Did not blow out")
   - SAFFIRE-III ".33 cm" read as 330 mm
   - SAME-R id collision across materials

   Second pass: 0 mismatches. Rows then get `verified = true`, `verified_by = "claude-code:auto+manual20"`.
3. **Human countersign** is still required: see `docs/HUMAN_TASKS.md` → "PSI contract countersign".

## 5. Contract files (`shared/contracts/*.schema.json`; all validated in `make test`)
`test_points.json` (685 rows: 275 FLEX + 410 PSI), `investigations.json` (accession, psi_id, doi, psi_investigation_url,
title_official, objective_official, files_used with sha256, n_verified_rows), `materials.json` (15 materials with real
data), `earth_vs_orbit.json` (7 SAFFIRE-II like-for-like rows), `evidence_index.json`, `boundary.json`, `coverage.json`,
`provenance.json`. `physics/validate/trace_ui_numbers.py` fails the build if any number in `web/data` has no source and
locator, and no model provenance.

## 6. Known gaps (CP1)
- BRE (PSI-20) per-test conditions and extinction times: TP files fetched; parsing is the CP2 item.
- `boundary.json` is `available: false`. Only 9 non-burn solid outcomes carry a numeric flow (43 more are flow-censored), and there is no partial-gravity or reduced-pressure solid data. See the file for the gate numbers and the observed burn envelope.
- No BASS/BASS-II 1-g results for the same material and thickness, so `earth_vs_orbit` uses SAFFIRE-II only.
