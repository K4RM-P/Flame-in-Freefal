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
6. **Keys/accounts (done 2026-11-16):** `OPENAI_API_KEY` is set on the emberatlas-five Vercel project (never `NEXT_PUBLIC_`).
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

13. **Vercel `OPENAI_API_KEY` (done 2026-11-16):** set on https://emberatlas-five.vercel.app.

14. **Self-host the NASA images (sandbox network blocked the download, proxy 403):** download each file, crop out any NASA logo/insignia (Space Apps rules), save at the exact path, then set `selfHosted: true` for that entry in `web/lib/media.ts` (and fill `width`/`height` where null):
    - `web/public/nasa/jsc2023e002281.jpg` ← https://science.nasa.gov/wp-content/uploads/2024/01/jsc2023e002281orig.jpg?format=jpeg&w=1280 (landing hero + OpenGraph)
    - `web/public/nasa/jsc2023e046375.jpg` ← https://www.nasa.gov/wp-content/uploads/2023/12/jsc2023e046375medium.jpg (Saffire-IV photo, 1280×1037)
    - `web/public/nasa/GRC-1998-C-00485.jpg` ← https://images-assets.nasa.gov/image/GRC-1998-C-00485/GRC-1998-C-00485~medium.jpg (candle on Earth vs in microgravity)
    - `web/public/nasa/iss040e072900.jpg` ← https://images-assets.nasa.gov/image/iss040e072900/iss040e072900~large.jpg (BASS-II flame on the ISS)
    One-liner once the files are in place: `pnpm -C web add -D sharp` and crop with `sharp(in).extract({left,top,width,height}).toFile(out)`.
15. **NASA candle photo (landing story, beat 2):** supply the public-domain NASA Glenn photo GRC C-1998-485 (candle flame in 1 g vs microgravity), cropped so no NASA logo shows (Space Apps rule), as `web/public/media/nasa-candle-grc-c-1998-485.jpg`. The story currently shows a labelled "NASA photo" placeholder frame (`components/landing/Story.tsx`, `data-testid="nasa-photo-placeholder"`); swap it for an `<img>` with the credit line kept.
16. **Demo video:** record a muted 16:10 screen capture of `/simulator?preset=iss-vs-lunar&run=1` (≈15–20 s, H.264, < 8 MB) and save it as `web/public/media/demo.mp4`. The landing picks it up automatically at build time; until then it shows a real screenshot of the simulator (`web/public/media/sim-3d.webp`).
17. **Artemis II citation:** confirm the Aerospace America (AIAA) article cited in story beat 1 (see `docs/SUBMISSION.md`) supports the "~80,000 miles from home" wording.

## Added in the final polish pass (2026-11-16)
18. **Parchment model / "99.86 %" claim (blocker for any mention of it):** the team's 150-burn parchment dataset (videos/CSV), its model and the accuracy method are **not in the repo**, so nothing in the app or docs claims 99.86 %. To include it: add the data under `physics/data/raw/parchment/` (with source and licence), the model code under `physics/`, and a Methods note stating which NASA space data it was compared to, how many comparisons, exactly what "99.86 %" measures, and its limits. Then link it from `/methods` and `/evidence`.
19. **Demo video URL:** replace `TODO_VIDEO_URL` in `README.md` (and add it to `docs/SUBMISSION.md`).
20. **Delete the second Vercel project `flame-in-freefal` (team decision 2026-11-16: keep only emberatlas-five):** the deletion from the build session was blocked by its permission settings. Delete it in Vercel → flame-in-freefal → Settings → Advanced → Delete Project (it has no key and serves the same `main`).
21. **Challenge link:** the footer/About/Credits link to `https://www.spaceappschallenge.org/` (the exact 2026 "Flame in Freefall" challenge page could not be opened from the build sandbox). Paste the exact challenge URL into `web/lib/team.ts → CHALLENGE_URL`.
22. **Fonts (resolved 2026-11-16):** the app now uses Space Grotesk / Inter / JetBrains Mono (OFL, self-hosted via @fontsource), as the submission text says.

## Added by the 2026-11-16 audit (docs/AUDIT.md)
23. **Quench limit (`low_flow_quench_cm_s = 5 cm/s`, TODO_VERIFY):** this value decides the headline ISS result ("quenched at 30 s"). Confirm it against the BASS-II paper (Sci. Rep. 2017, https://doi.org/10.1038/s41598-017-18398-4) and set `status` in `physics/data/properties.yaml`.
24. **References without a public URL (done 2026-11-16):** all 12 now carry a verified URL, DOI or NTRS link in `physics/data/sources.yaml` (Turns, Incropera, White, Quintiere, SFPE/Beyler, CHEMKIN/Kee, Seinfeld & Pandis, Saffire VI ICES 2024, Dehghani BRE, SAME-R, NFPA 2001/Senecal, and the drop-tower helium study, matched to Gokoglu, Son & Ronney, NTRS 20040161188). A science checker may confirm the drop-tower match.
25. **Brand assets (done 2026-11-16):** the flame logo and the Aster mascot are original work by Team Max Q (credited in `software.yaml → images`).
26. **Materials list:** `web/data/materials.json` has both "PMMA & Nomex" and "Nomex" as separate materials (they show as two bars on the envelope explorer). A science checker should confirm whether they should be merged.
27. **`make export` now runs, but changes committed data:** after the final-polish fix it completes, yet it rewrites `web/data/psi/tables_index.json` (e.g. BASS-II `qc_rows` 57 → 67), `web/public/psi/same_r.json`, `sources.json` and `psi_catalog.json` from `physics/data/processed`. The 2026-11-16 audit did not commit those changes (unverified). A science checker should diff them and decide; only `docs/REFERENCES.json` / `web/data/references.json` were regenerated (via `write_references`).
- The audit found no parchment-burn model, accuracy figure or "never done before" claim anywhere in the repo or the app (checked 2026-11-16); keep it that way unless #18 is resolved.
