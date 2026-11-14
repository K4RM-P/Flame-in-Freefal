# Human tasks (blockers and sign-offs)

1. **Registration (submission blocker):** confirm every teammate is registered for the same Space Apps event and on the Members tab (max 6).
2. **PSI account:** register on psi.nasa.gov if needed; download one raw BASS-II or Saffire sensor time series into `physics/data/raw/psi/`.
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
6. **Keys/accounts:** provide `ANTHROPIC_API_KEY` (Vercel env) and the Vercel account/team.
7. **Video:** record the 30-second video on the production URL (script in PRD §13), English subtitles.
- Drop-tower suppressant study (PRD §2): supply the full citation for `drop-tower-suppressant` in sources.yaml.
