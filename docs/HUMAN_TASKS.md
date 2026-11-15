# Human tasks (still-open verification and sign-offs)

1. **Registration (submission blocker):** confirm every teammate is registered for the same Space Apps event and on the Members tab (max 6).
3. **Digitize figures (≤ 2 h, WebPlotDigitizer)** — see `physics/data/digitized/README.md` for the exact list. These unlock V6–V10.
4. **FLEX spot-check countersign:** Claude Code visually checked 35 rows (PDF p.30, FLEX-136..171, 0 mismatches). Please re-check 20 rows below against NASA/TP-2015-216046 Table IX and write your name/date into `physics/data/verification.yaml → human_countersign`.
   Sample: FLEX-002, -006, -018, -030, -035, -049, -062, -065, -100, -120, -140, -146, -157, -167, -187, -195, -203, -240, -270, -280.
   Also confirm FLEX-114 (pressure printed as 0.0 mmHg) is a typo in the TP; it is excluded until resolved.
5. **Science checker** — review every `TODO_VERIFY` in `physics/data/properties.yaml`, `missions.yaml`, `limits.yaml`, `investigations.yaml`, every equation on `/methods`, and every caveat. Priority items:
   - **PRD §5.3 error:** the PRD says C_thin = π/4 (full thickness) is "equivalent to √2 with half-thickness". It is not: de Ris' √2/τ with τ = d/2 equals 2√2/d ≈ 2.83/d vs π/4 ≈ 0.785/d (3.6×). We use π/4 with full thickness (Quintiere's simplified form) and document it; confirm the choice.
   - **CO₂ exposure limits:** JSC 20584 Rev C (2024) **deleted** CO₂ SMACs; `limits.yaml` holds legacy candidate values (1 h 2%, 24 h 1.3%, ≥7 d 0.7%). Replace with current NASA-STD-3001 Vol. 2 values.
   - **1 g T_crit:** derived from the n-heptane cup-burner N₂ MEC (candidate 32%, NFPA 2001/Senecal 2005). Confirm the MEC value.
   - Fuel properties (Turns App. B; NIST), species conductivities (Incropera Table A.4), Westbrook–Dryer activation energies, PMMA/cellulose properties (Quintiere), SIBAL thickness and areal density, CO yields (SFPE/Tewarson), mission free volumes.
   - Investigation cards (`investigations.yaml`): confirm years, hardware, fuels, ranges against PSI pages.
6. **Keys/accounts:** provide `OPENAI_API_KEY` (+ optional `OPENAI_MODEL`) as Vercel env vars, never `NEXT_PUBLIC_` and the Vercel account/team.
7. **Video:** record the 30-second video on the production URL (script in docs/PITCH.md), English subtitles.
- Drop-tower suppressant study (PRD §2): supply the full citation for `drop-tower-suppressant` in sources.yaml.

8. **PSI files the API would not list (HTTP 500 on 2026-11-14):** PSI-21 (ACME CLD Flame) and PSI-106 (SLICE). Open each on psi.nasa.gov in a browser; if an "Experimental table" CSV exists, save it to `physics/data/raw/psi/<accession>/` with its exact file name and rerun `make data`. DOI lookups also returned 500 for PSI-60, PSI-62, PSI-115 and PSI-117; add their DOIs to `investigations.yaml` if the PSI pages show one.
9. **SAFFIRE-II ambiguous cells (PSI-99):** thickness "037 mm" (samples 2-4, 2-5, 2-6) and the blank material cells of 2-6 and 2-9 were left null, not guessed. Confirm against the SAFFIRE-II paper and record the answer in `physics/data/verification.yaml → psi_spotcheck` (do not edit the processed CSV by hand).
10. **New TODO_VERIFY values:** `smoke.particle_density` (unit-density convention from the PSI-47 workbook, used for SM4 settling) and the ACME BRE result "extinct at 21 % within ~40 s; steady at 26.5/34/40 %" (`dehghani-bre`).
11. **Earth test vs orbit wording review:** a science checker should read `/evidence#earth-vs-orbit` and confirm the classification rule (Complete / ~0 / partial) and that the 1 g column in PSI-99 is the normal-gravity screening result the SAFFIRE objective refers to.

12. **GitHub Pages (repo admin):** Settings → Pages → Build and deployment → Source = **GitHub Actions**, then re-run the "Deploy web app to GitHub Pages" workflow (Actions tab). Until then https://k4rm-p.github.io/Flame-in-Freefal/ shows the README rendered by Jekyll, not the app.

## PSI table spot-check (verified=false until done)
Open each file from psi.nasa.gov (or `physics/data/raw/psi/`) and compare the listed rows with `physics/data/processed/psi/<table>.csv` (normalized columns + `raw`). Record name/date per table in `physics/data/verification.yaml → psi_spotcheck`.

- **bass**: `PSI-26_Experimental table_BASS.csv` lines 3, 13, 19, 23, 31, 39, 44, 60, 61, 72, 80, 84, 85, 91, 98, 100, 108, 117, 119, 121
- **bass2**: `PSI-25_Experimental table_BASS-II.csv` lines 16, 35, 42, 44, 48, 49, 59, 70, 75, 78, 85, 87, 94, 103, 108, 114, 115, 117, 118, 128
- **bre**: `PSI-20_Experimental table_ACME BRE.csv` lines 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19
- **saffire**: `PSI-100_Experimental table_SAFFIRE-3.csv` lines 2, 3; `PSI-98_Experimental table_SAFFIRE-1.csv` lines 2, 3; `PSI-99_Experimental table_SAFFIRE-2.csv` lines 2, 3, 4, 5, 6, 7, 8, 9, 10
- **same_r**: `PSI-101_Experimental table_SAME-R.csv` lines 3, 9, 15, 18, 24, 27, 30, 32, 58, 60, 67, 69, 71, 73, 77, 79, 84, 90, 92, 98
- **spice**: `PSI-107_Experimental table_Spice.csv` lines 5, 41, 50, 51, 59, 133, 137, 142, 167, 174, 179, 192, 204, 252, 291, 299, 375, 382, 385, 444

- [ ] Spot-check the visualization-only flame correlations in `web/data/params/flame_visual.json` (Heskestad 1983 constants 0.235/1.02; puffing c = 1.5 from Cetegen & Ahmed 1993; air α at 800 K from Incropera Table A.4) and set `verified: true`.

13. **Vercel `OPENAI_API_KEY`:** the project (`flame-in-freefal`, https://flame-in-freefal.vercel.app) is linked, builds from `web/` and auto-deploys `main`, but has no env vars. vercel.com → flame-in-freefal → Settings → Environment Variables → add `OPENAI_API_KEY` (and optional `OPENAI_MODEL`) for Production + Preview (never `NEXT_PUBLIC_`) → Deployments → Redeploy the latest production deployment. Until then `/api/scenario` with valid text returns 503 "no key".
