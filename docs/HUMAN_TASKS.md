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
7. **Video (submission blocker):** record the ≤ 30-second video on the production URL (script in `docs/DEMO_SCRIPT.md`), English subtitles, host it publicly, then replace `TODO_VIDEO_URL` in `README.md` and `web/lib/site.ts` (`VIDEO_URL`; About and /credits pick it up).
- Drop-tower suppressant study (PRD §2): supply the full citation for `drop-tower-suppressant` in sources.yaml.

8. **PSI files the API would not list (HTTP 500 on 2026-11-14):** PSI-21 (ACME CLD Flame) and PSI-106 (SLICE). Open each on psi.nasa.gov in a browser; if an "Experimental table" CSV exists, save it to `physics/data/raw/psi/<accession>/` with its exact file name and rerun `make data`. DOI lookups also returned 500 for PSI-60, PSI-62, PSI-115 and PSI-117; add their DOIs to `investigations.yaml` if the PSI pages show one.
9. **SAFFIRE-II ambiguous cells (PSI-99):** thickness "037 mm" (samples 2-4, 2-5, 2-6) and the blank material cells of 2-6 and 2-9 were left null, not guessed. Confirm against the SAFFIRE-II paper and record the answer in `physics/data/verification.yaml → psi_spotcheck` (do not edit the processed CSV by hand).
10. **New TODO_VERIFY values:** `smoke.particle_density` (unit-density convention from the PSI-47 workbook, used for SM4 settling) and the ACME BRE result "extinct at 21 % within ~40 s; steady at 26.5/34/40 %" (`dehghani-bre`).
11. **Earth test vs orbit wording review:** a science checker should read `/evidence#earth-vs-orbit` and confirm the classification rule (Complete / ~0 / partial) and that the 1 g column in PSI-99 is the normal-gravity screening result the SAFFIRE objective refers to.


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

14. **Self-host the NASA images (sandbox network blocked the download, proxy 403):** download each file, crop out any NASA logo/insignia (Space Apps rules), save at the exact path, then set `selfHosted: true` for that entry in `web/lib/media.ts` (and fill `width`/`height` where null):
    - `web/public/nasa/jsc2023e002281.jpg` ← https://science.nasa.gov/wp-content/uploads/2024/01/jsc2023e002281orig.jpg?format=jpeg&w=1280 (landing hero + OpenGraph)
    - `web/public/nasa/jsc2023e046375.jpg` ← https://www.nasa.gov/wp-content/uploads/2023/12/jsc2023e046375medium.jpg (Saffire-IV photo, 1280×1037)
    - `web/public/nasa/GRC-1998-C-00485.jpg` ← https://images-assets.nasa.gov/image/GRC-1998-C-00485/GRC-1998-C-00485~medium.jpg (candle on Earth vs in microgravity)
    - `web/public/nasa/iss040e072900.jpg` ← https://images-assets.nasa.gov/image/iss040e072900/iss040e072900~large.jpg (BASS-II flame on the ISS)
    One-liner once the files are in place: `pnpm -C web add -D sharp` and crop with `sharp(in).extract({left,top,width,height}).toFile(out)`.
15. **NASA candle photo (landing story, beat 2):** supply the public-domain NASA Glenn photo GRC C-1998-485 (candle flame in 1 g vs microgravity), cropped so no NASA logo shows (Space Apps rule), as `web/public/media/nasa-candle-grc-c-1998-485.jpg`. The story currently shows a labelled "NASA photo" placeholder frame (`components/landing/Story.tsx`, `data-testid="nasa-photo-placeholder"`); swap it for an `<img>` with the credit line kept.
16. **Demo video:** record a muted 16:10 screen capture of `/simulator?preset=iss-vs-lunar&run=1` (≈15–20 s, H.264, < 8 MB) and save it as `web/public/media/demo.mp4`. The landing picks it up automatically at build time; until then it shows a real screenshot of the simulator (`web/public/media/sim-3d.webp`).
17. **Artemis II citation:** confirm the Aerospace America (AIAA) article cited in story beat 1 (see `docs/SUBMISSION.md`) supports the "~80,000 miles from home" wording.

## Added by the 2026-11-16 audit (docs/AUDIT.md)
18. **Live URL:** the brief names https://emberatlas-five.vercel.app, but the Vercel project connected here is `flame-in-freefal` (https://flame-in-freefal.vercel.app). Confirm which domain judges get, make sure it deploys from `main`, and set `NEXT_PUBLIC_SITE_URL` on Vercel to that URL (used for OpenGraph, sitemap and share links).
19. **`OPENAI_API_KEY` on Vercel (still missing on 2026-11-16):** the project has no environment variables. Everything works offline, but add the key (Production + Preview, never `NEXT_PUBLIC_`) for model-written answers.
20. **Quench limit (`low_flow_quench_cm_s = 5 cm/s`, TODO_VERIFY):** this value decides the headline ISS result ("quenched at 30 s"). Confirm it against the BASS-II paper (Sci. Rep. 2017, https://doi.org/10.1038/s41598-017-18398-4) and set `status` in `physics/data/properties.yaml`.
21. **References without a public URL** (Space Apps asks for full URLs): add a publisher, DOI or NTRS URL to each in `physics/data/sources.yaml`, then regenerate `docs/REFERENCES.json` (`make export`, or `write_references` as in the commit for U6):
    - White, F. M., Viscous Fluid Flow, 3rd ed., Table 1-2/1-3 (Sutherland constants for air)
    - Bergman, Lavine, Incropera, DeWitt, Fundamentals of Heat and Mass Transfer, 7th ed., Table
    - Kee et al., CHEMKIN transport (mixture-averaged conductivity: 0.5(sum x k + 1/sum x/k)); M
    - Turns, S. R., An Introduction to Combustion, 3rd ed. (Ch. 10 droplet d2-law; Ch. 9 Burke-S
    - Beyler, C., Flammability limits of premixed and diffusion flames, SFPE Handbook of Fire Pr
    - Quintiere, J. G., Fundamentals of Fire Phenomena, Wiley (Ch. 7 opposed-flow flame spread; 
    - Saffire VI results, ICES-2024-365
    - Dehghani, P., ACME Burning Rate Emulator (BRE), PhD dissertation, University of Maryland; 
    - Urban, D. L., et al., Smoke Aerosol Measurement Experiment (SAME/SAME-R), AIAA 2013; Aeros
    - Seinfeld, J. H., Pandis, S. N., Atmospheric Chemistry and Physics, 3rd ed., Ch. 13 (coagul
    - NFPA 2001, Standard on Clean Agent Fire Extinguishing Systems (cup-burner minimum extingui
    - Drop-tower gaseous-suppressant study finding helium most effective (cited in PRD §2; full
22. **Brand assets:** confirm who made the flame logo (`web/public/logo.png`) and the Aster mascot, and that the team owns them (listed as "Team EmberAtlas, MIT" in `software.yaml → images`).
23. **Team bios on /about** were drafted by an AI pass from each member's focus line: each member should read and approve their own.
24. **Materials list:** `web/data/materials.json` has both "PMMA & Nomex" and "Nomex" as separate materials (they show as two bars on the envelope explorer). A science checker should confirm whether they should be merged.
25. **Pre-existing `make export` failure:** `physics/validate/export.py` stops with `'DataFrame' object has no attribute 'accession'` after writing references (the PSI table export step). The web data in the repo is the last good export; fix before the next `make data`.
- No parchment-burn model or "never done before" claim exists anywhere in the repo (checked 2026-11-16), so nothing needs backing there.
