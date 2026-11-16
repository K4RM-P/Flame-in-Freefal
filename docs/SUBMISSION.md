# EmberAtlas: NASA Space Apps 2026 submission

**Title:** EmberAtlas: the firefighter for space

**One-liner:** EmberAtlas: the firefighter for space. It shows where and how a fire would start in your spacecraft, and which design change prevents it. Built on NASA's ISS fire data, explained by AI.

## Summary (150 words)
On Artemis II, a smoke alarm went off in Orion. Fire in space is hard to see and impossible to escape. Maya approves cabin fabrics for a Moon base that will breathe 34% oxygen at 56.5 kPa and one-sixth gravity, and nobody can tell her if they are safe: no solid in NASA's PSI data was ever burned above 22.2% oxygen. EmberAtlas is the firefighter for space. Find: it burns the same NASA-tested fabric in an ISS cabin and a Moon cabin. Explain: on the ISS, cutting the fan puts the fire out at 30 s; on the Moon the fire outlasts a 2 kg CO₂ extinguisher and burns out at 171 s. Prevent: a deterministic design review ranks the fixes, starting with the gap that the extinguisher never fires. Then it names the next test. Every number traces to a PSI accession or is labelled a design input.

- **Demo link:** TODO_VIDEO_URL
- **Project link:** https://emberatlas-five.vercel.app · repository https://github.com/K4RM-P/flame-in-freefal · all resources: https://emberatlas-five.vercel.app/credits

## Detailed description
EmberAtlas follows one story: (1) the Artemis II smoke alarm; (2) fire in space is hard to see and impossible to escape; (3) Maya approves fabrics for a 34% O₂ Moon base; (4) nobody can tell her if it is safe; (5) EmberAtlas: **Find · Explain · Prevent**; (6) the next test to fly. It has three surfaces: `/simulator`, `/evidence` and `/methods` (plus `/` and `/about`). The simulator ships four presets: *Saffire replay*, *Same fabric: ISS vs Lunar Habitat* (same crew-detection, fan-off and CO₂ response in both cabins, all design inputs), *Moon base: find the gaps* (the unfixed cabin for the design review) and *Lunar Habitat: tune the response*. `/simulator?preset=iss-vs-lunar&run=1` loads and runs the comparison in one click. Exact demo numbers: `docs/DEMO_SCRIPT.md`.

### Prevent: design review
`web/lib/sim/designReview.ts` ranks fixes deterministically (no API): rule-based gaps first (extinguisher with no alarm path, no suppression, ventilation not cut on alarm, ignition material outside its tested O₂), then the largest one-at-a-time sensitivity swings on time to extinguish, peak heat, minimum ppO₂ and peak CO, each with before → after copied from the engine. Fixes resting on an uncalibrated sub-model are labelled theory-only and never outrank calibrated or rule-based ones; O₂ levers never go below the crew ppO₂ floor; partial-gravity results are estimates that may be non-conservative (NASA FM2, NTRS 20240015307). The AI interpretation must name fix #1.

### Identify
The evidence ranking (`web/lib/sim/evidence.ts`) gates PSI investigations by material class first: for a solid fabric, investigations that burned that material rank first, then solid-fuel campaigns (BASS, BASS-II, SAFFIRE), then ACME BRE when the mission O₂ is at least 26%. Droplet campaigns (FLEX, FLEX-2, CFI) appear only for suppression; SAME, SAME-R and DAFT for smoke. The Evidence page shows the Earth-vs-orbit table, the "where the evidence stops" table and the mission-to-experiment match.

### Extract
Every run exports CSV of the PSI rows it used (accession, file, line) and the simulated time series (`web/lib/sim/export.ts`).

### Highlight
Earth test vs orbit (SAFFIRE-II, PSI-99, counts computed from data); where the evidence stops (highest tested O₂, pressure and flow per material vs the mission); and the next test, ranked by how far each out-of-envelope input sits from the tested range. Inside the envelope, the app says no new test is needed.

### SI
The OpenAI API drafts scenario fields from a plain-language description (you review every field before running), interprets a finished run, and explains experiment matches. Each call is grounded only on engine output and ranked PSI rows, and a numeric guard (`web/lib/ai/guard.ts`) rejects any number not present in that context. Without an API key every AI surface answers deterministically from the engine output (`web/lib/ai/explain.ts`), marked offline; nothing is faked.

## NASA data
NASA PSI Data Repository, Combustion Science (https://psi.nasa.gov/physci/repo/search?q=combustion), accessed 2026-11-14 via the public PSI API (GET only). Experimental tables used (row counts in `web/data/psi/tables_index.json`, processed copies in `web/public/psi/*.json`):
- PSI-10 Advanced Combustion via Microgravity Experiments / Flame Design: `PSI-10_Experimental table_Flame Design_Normal Flame.csv`, `PSI-10_Experimental table_Flame Design_Inverse Flame.csv`
- PSI-20 Advanced Combustion via Microgravity Experiments - Burning Rate Emulator: `PSI-20_Experimental table_ACME BRE.csv`
- PSI-22 Advanced Combustion via Microgravity Experiments Electric-Field Effects on Laminar Diffusion Flames: `PSI-22_Experimental table_ACME E-FIELD Flames.csv`
- PSI-23 Advanced Combustion via Microgravity Experiments-Structure and Response of Spherical Diffusion Flames: `PSI-23_Experimental table_ACME s-Flame.csv`
- PSI-25 Burning and Suppression of Solids - II: `PSI-25_Reference Data_Fan calibration data.xlsx`, `PSI-25_Science Documents_BASS-II_Test.Matrices.xlsx`, `PSI-25_Experimental table_BASS-II.csv`
- PSI-26 Burning and Suppression of Solids: `PSI-26_Science Documents_As Run_Test Matrix.xlsx`, `PSI-26_Experimental table_BASS.csv`
- PSI-39 Cool Flames Investigation: `PSI-39_Experimental table_CFI.csv`
- PSI-47 Dust and Aerosol Measurement Feasibility Test / Dust and Aerosol Measurement Feasibility Test-2: `PSI-47_Analyzed Data_DAFT Retrieved Data Summary.xls`, `PSI-47_Experimental table_DAFT.csv`
- PSI-68 Flame Extinguishment Experiment - 2: `PSI-68_Experimental table_Flex2.csv`
- PSI-69 Flame Extinguishment Experiment: `PSI-69_Experimental table_FLEX.csv`
- PSI-98 Spacecraft Fire Safety Experiment-I: `PSI-98_Experimental table_SAFFIRE-1.csv`
- PSI-99 Spacecraft Fire Experiment-II: `PSI-99_Experimental table_SAFFIRE-2.csv`
- PSI-100 Spacecraft Fire Experiment-III: `PSI-100_Experimental table_SAFFIRE-3.csv`
- PSI-101 Smoke Aerosol Measurement Experiment-Reflight: `PSI-101_Analyzed Data_SAME, SAME-R_Results.xlsx`, `PSI-101_Experimental table_SAME-R.csv`
- PSI-102 Smoke and Aerosol Measurement Experiment: `PSI-102_Experimental table_SAME.csv`
- PSI-107 Smoke Point In Co-flow Experiment: `PSI-107_Experimental table_Spice.csv`
- PSI-142 Quantitative Studies of Cool Flame Transitions at Radiation / Stretch Extinction Using Counterflow Flames: `PSI-142_Experimental table_Data Summary Table.csv`
- PSI-159 Advanced Combustion via Microgravity Experiments / Cool Flames Investigation with Gases: `PSI-159_Experimental table_CFI-G_Normal Flames.csv`, `PSI-159_Experimental table_CFI-G_Inverse Flames.csv`
- PSI-100 cabin telemetry for the Saffire replay: `PSI-100_Raw Data_Raw telemetry file.csv` (`web/data/psi/saffire_telemetry.json`).
- NASA Technical Reports Server: FLEX NASA/TP-2015-216046 (Table IX, cross-checked against PSI-69) and JSC 20584 Rev C.

## Space-agency partner data
None.

## Use of AI
- Claude Code (Anthropic) and Codex (OpenAI) wrote and refactored the code, data pipelines, tests and docs under human direction and review. Source files carry an "SI-assisted" header naming the tool.
- At runtime the OpenAI API powers the scenario builder, run interpretation and the match explanation (grounded, numeric guard).
- No SI-generated images or video. The landing image is NASA's (SoFIE-GEL, NASA/JSC).

## References
From `docs/REFERENCES.json` (full list there, including software and fonts).
- GRI-Mech 3.0 thermodynamic data (thermo30.dat), NASA 7-coefficient polynomials <http://combustion.berkeley.edu/gri-mech/version30/files30/thermo30.dat>
- NIST Chemistry WebBook, Helium: ideal-gas Cp = 20.786 J/mol/K (monatomic, 5/2 R) <https://webbook.nist.gov/cgi/cbook.cgi?ID=C7440597>
- IUPAC Standard atomic weights (abridged, 2021) <https://iupac.qmul.ac.uk/AtWt/>
- White, F. M., Viscous Fluid Flow, 3rd ed., Table 1-2/1-3 (Sutherland constants for air)
- Bergman, Lavine, Incropera, DeWitt, Fundamentals of Heat and Mass Transfer, 7th ed., Table A.4 (gas properties at 1 atm)
- Kee et al., CHEMKIN transport (mixture-averaged conductivity: 0.5(sum x k + 1/sum x/k)); Mathur, Tondon & Saxena (1967) Mol. Phys. 12:569
- Turns, S. R., An Introduction to Combustion, 3rd ed. (Ch. 10 droplet d2-law; Ch. 9 Burke-Schumann; App. B fuel properties)
- NIST Chemistry WebBook, Methanol: enthalpy of vaporization near Tb (~35.2 kJ/mol) <https://webbook.nist.gov/cgi/cbook.cgi?ID=C67561>
- Westbrook, C. K., Dryer, F. L., Simplified reaction mechanisms for the oxidation of hydrocarbon fuels in flames, Combust. Sci. Tech. 27:31-43 (Table 2) <https://doi.org/10.1080/00102208108946970>
- Huggett, C., Estimation of rate of heat release by means of oxygen consumption measurements, Fire and Materials 4(2):61-65 <https://doi.org/10.1002/fam.810040202>
- Beyler, C., Flammability limits of premixed and diffusion flames, SFPE Handbook of Fire Protection Engineering (critical adiabatic flame temperature ~1500-1600 K)
- Quintiere, J. G., Fundamentals of Fire Phenomena, Wiley (Ch. 7 opposed-flow flame spread; material properties tables)
- de Ris, J. N., Spread of a laminar diffusion flame, Proc. Combust. Inst. 12:241-252 <https://doi.org/10.1016/S0082-0784(69)80407-8>
- Fernandez-Pello, A. C., Ray, S. R., Glassman, I., Flame spread in an opposed forced flow: the effect of ambient oxygen concentration, Proc. Combust. Inst. 18:579-589 <https://doi.org/10.1016/S0082-0784(81)80063-X>
- Olson, S. L., Mechanisms of microgravity flame spread over a thin solid fuel: oxygen and opposed flow effects, Combust. Sci. Tech. 76:233-249 <https://doi.org/10.1080/00102209108951711>
- Chao, B. H., Law, C. K., T'ien, J. S., Structure and extinction of diffusion flames with flame radiation, Proc. Combust. Inst. 23:523-531 <https://doi.org/10.1016/S0082-0784(06)80299-1>
- Dietrich, D. L., et al., Flame Extinguishment Experiment (FLEX) results, NASA/TP-2015-216046 (Appendix A Table IX; Appendix B per-test captions) <https://ntrs.nasa.gov/citations/20150023456>
- Dietrich, D. L., Nayagam, V., Hicks, M. C., Ferkul, P. V., Dryer, F. L., Farouk, T., Shaw, B. D., Suh, H. K., Choi, M. Y., Liu, Y. C., Avedisian, C. T., Williams, F. A., Droplet Combustion Experiments Aboard the International Space Station, Microgravity Sci. Technol. 26:65-76 <https://doi.org/10.1007/s12217-014-9372-2>
- NASA JSC 20584 Rev C, Spacecraft Maximum Allowable Concentrations (SMACs), 6/13/2024 (CO2 SMACs deleted in this revision) <https://ntrs.nasa.gov/citations/20240007713>
- NASA-STD-3001 Vol. 2, Human Factors, Habitability, and Environmental Health (CO2 limits; under revision per JSC 20584 Rev C) <https://standards.nasa.gov/standard/NASA/NASA-STD-3001-VOL-2>
- Exploration atmosphere (34% O2, 8.2 psia) for lunar surface habitats, NTRS 20240003211 <https://ntrs.nasa.gov/citations/20240003211>
- NASA Space Apps Challenge 2026, Flame in Freefall challenge statement (Moon base 30% O2, 70.3 kPa) <https://www.spaceappschallenge.org/>
- BASS-II PMMA flame spread and limiting O2 in microgravity vs 1 g, Sci. Rep. (2017) <https://doi.org/10.1038/s41598-017-18398-4>
- BASS-II results, NTRS 20160000593 <https://ntrs.nasa.gov/citations/20160000593>
- BASS-II SIBAL concurrent flame spread, NTRS 20150008962 <https://ntrs.nasa.gov/citations/20150008962>
- Saffire I-III test matrix and results, NTRS 20180005168 <https://ntrs.nasa.gov/citations/20180005168>
- Saffire IV-V spacecraft vehicle response to a large-scale fire, ICES 2021, NTRS 20210011521 <https://ntrs.nasa.gov/citations/20210011521>
- Saffire VI results, ICES-2024-365
- Dehghani, P., ACME Burning Rate Emulator (BRE), PhD dissertation, University of Maryland; Combust. Flame 228 (2021)
- Urban, D. L., et al., Smoke Aerosol Measurement Experiment (SAME/SAME-R), AIAA 2013; Aerosol Sci. Tech. 49 (2015)
- LUCI (lunar-gravity combustion), NTRS 20250010653 - OUTSIDE PSI <https://ntrs.nasa.gov/citations/20250010653>
- FM2 (Flammability of Materials on the Moon), NTRS 20240015307 - OUTSIDE PSI <https://ntrs.nasa.gov/citations/20240015307>
- NASA Physical Sciences Informatics (PSI) system, Combustion Science <https://psi.nasa.gov>
- Seinfeld, J. H., Pandis, S. N., Atmospheric Chemistry and Physics, 3rd ed., Ch. 13 (coagulation kernel, Cunningham slip correction)
- NASA Orion reference guide (habitable volume ~316 ft3 / 9 m3) <https://www.nasa.gov/reference/orion-reference-guide/>
- NASA ISS facts and figures (habitable volume 388 m3) <https://www.nasa.gov/international-space-station/space-station-facts-and-figures/>
- NFPA 2001, Standard on Clean Agent Fire Extinguishing Systems (cup-burner minimum extinguishing concentrations; n-heptane N2 ~30-34 vol%); Senecal, J. A., Fire Safety J. 40 (2005) 579-591
- Drop-tower gaseous-suppressant study finding helium most effective (cited in PRD §2; full reference TODO_VERIFY) - OUTSIDE PSI
- NASA PSI Data Repository: Combustion Science (Space Apps 2026 challenge Resources tab) <https://psi.nasa.gov/physci/repo/search?q=combustion>
- A Researcher's Guide to International Space Station Combustion Science (challenge Resources tab) <https://www.nasa.gov/missions/station/a-researchers-guide-to-combustion-science/>
- Aerospace America (AIAA), "Artemis II astronauts praise Orion capsule, reflect on mission impact" <https://aerospaceamerica.aiaa.org/artemis-ii-astronauts-praise-orion-capsule-reflect-on-mission-impact/>
