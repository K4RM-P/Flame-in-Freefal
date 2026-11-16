# EmberAtlas: the firefighter for space

**Describe a spacecraft cabin, burn it with a physics engine calibrated on NASA fire experiments, ask Aster (the AI fire engineer) why, and fix it before launch.**
NASA Space Apps 2026 · challenge: [Flame in Freefall](https://www.spaceappschallenge.org/) · Team Max Q, Toronto.

- **Live app:** https://emberatlas-five.vercel.app
- **Demo video:** TODO_VIDEO_URL
- **One-click demo:** `/simulator?preset=iss-vs-lunar&run=1`
- **Every resource with its URL:** [`/credits`](https://emberatlas-five.vercel.app/credits) · [`docs/REFERENCES.json`](docs/REFERENCES.json) · [full list below](#credits-and-resources-full-list) · audit and plan: [`docs/AUDIT.md`](docs/AUDIT.md)

![EmberAtlas simulator: ISS vs Moon base](docs/screenshots/3d-compare.png)

## The problem
Fire behaves differently in microgravity: no buoyancy, so flames depend on airflow, and the 1 g tests used to qualify materials do not always predict orbit. Lunar habitats will breathe an exploration atmosphere (34 % O₂ at 56.5 kPa, NTRS 20240003211) where **no solid in NASA's PSI repository has been burned** (highest tested solid O₂: 22.2 %), and at 1/6 g, where NASA's FM2 tests show some materials burn more readily than at either µg or 1 g. Designers need to see where a cabin fire would start, how it would end, and where the evidence stops.

## What it does (4 steps)
1. **Describe:** pick a preset or describe the cabin in words; *Build with AI* drafts the scenario from NASA atmospheres and PSI-tested materials only and flags every assumption.
2. **Burn with NASA data:** a cabin fire engine (one well-mixed zone, 1-D flame front per item, Monte Carlo bands) runs it in 3D. Every result outside the tested PSI envelope carries an **EXTRAPOLATED** badge.
3. **Ask Aster:** answers from the engine's own numbers and the NASA records, with citations; a numeric guard removes any number not in the tool output and shows how many were checked.
4. **Fix before launch:** a deterministic design review ranks fixes you can apply and re-run, then names the next test to fly.

**Demo result** (`pnpm -C web exec tsx scripts/engine-check.ts`, see `docs/DEMO_SCRIPT.md`): the same SAFFIRE SIBAL fabric with the same crew response (detect at 30 s, fan off, 2 kg CO₂ 30 s later; design inputs). **The fire lasts 5.7× longer on the Moon base.** **ISS:** out at 30 s, *quenched*: in microgravity nothing moves the air once the fan stops, so the flame falls below the 5 cm/s low-flow limit (BASS-II; still `TODO_VERIFY`). **Moon base:** buoyancy keeps air moving past the flame, so it *burns out* the whole sample at 171 s; the CO₂ does not stop it. Peak heat 4 900 W vs 2 580 W. Ask Aster "Why does the Moon fire last longer?" and the answer comes from this run: 17 numbers checked against the engine, citing PSI-98/99/100, PSI-25 and FM2 (NTRS 20240015307), with or without an OpenAI key. Ranked fixes on the unfixed Moon cabin: give the extinguisher an alarm path; test SIBAL at 34 % O₂ (it was tested only to 22.1 %); lower cabin O₂ to 29.2 % (peak 4 920 W → 4 040 W).

## New in this version (see `docs/AUDIT.md`)
| Upgrade | Where |
|---|---|
| **Run-aware Aster**: a deterministic explainer answers from the engine run (offline included), routed by question type; BM25 + topic-boosted catalog search; citation chips open the Evidence entry or NTRS; follow-up questions | simulator → Ask Aster |
| **What changed**: before/after diff for Apply & re-run, what-ifs and any A/B compare; sensitivity levers can now be applied too | simulator → AI analyst / result strip |
| **Material envelope explorer**: every PSI-tested solid's O₂ × pressure (or flow) range with mission cabins and *your* cabin on one chart | `/evidence#envelope`, linked from Next test |
| **Next-test brief** and **run report** (Markdown), **shareable run links** (`?s=`, re-runs the exact scenario) | Next test · More → Copy link / Export |
| **Search** on Methods, Evidence and Credits (`/` to focus; deep links open the equation card) | `/methods`, `/evidence`, `/credits` |
| Fixes: phone 3D view, verdict says why each fire ended, engine input validation, claim corrections, Methods limits on gravity and pressure, Space Grotesk / Inter / JetBrains Mono | everywhere |

## How NASA data is used
- **2,818 PSI table rows from 18 accessions** (`web/data/psi/tables_index.json`), each with accession + file + line and the raw cell string; ambiguous cells are flagged, never filled. The full list with titles, DOIs and what each is used for is on `/evidence#psi-datasets` and `/credits`.
- Key datasets: BASS / BASS-II (PSI-26, PSI-25) tested envelopes; SAFFIRE-I/II/III (PSI-98/99/100) spread calibration, held-out test, Earth-vs-orbit and the Saffire-III cabin replay; FLEX (PSI-69, cross-checked against NASA/TP-2015-216046) droplet burning rates; ACME BRE (PSI-20) for exploration atmospheres; SAME / SAME-R / DAFT (PSI-102/101/47) smoke evidence.
- Outside PSI (labelled so): FM2 (NTRS 20240015307) and LUCI (NTRS 20250010653) for partial gravity.

## How the physics works (short)
Opposed-flow flame spread (de Ris thin-fuel form, calibrated on one SAFFIRE sample), droplet d²-law burning (fit on FLEX), oxygen-consumption heat release, agent dilution and inerting, low-flow quench, smoke transport delay to the detector. Partial gravity is interpolated between µg and 1 g, never measured. Python (`physics/emberphys`) is the source of truth; the TypeScript port matches `shared/golden_vectors.json` to rtol 1e-6. Details, equations and limits: `/methods`.

## Validation (real numbers, from the files named)
| Check | Result | File |
|---|---|---|
| FLEX table cross-check (PSI-69 vs NASA/TP-2015-216046) | 0 mismatches in 1,533 values | `web/data/psi/flex_crosscheck.json` |
| Droplet burning-rate constant K, held-out FLEX tests | ~13 % mean absolute error (MAPE 13.3 %), n = 66 | `web/data/validation/droplet_K.json` |
| Flame spread, held-out SAFFIRE-III sample III-2 | 29.3 % error, n = 1 (one training, one test sample) | `web/data/params/spread.json` |
| Saffire-III cabin replay (PSI-100 T, P) | T RMSE ~6 K, P MAPE ~0.2 %: sanity check only (a sample-size fire barely changes the cabin) | computed live, `docs/VALIDATION.md` |
| Validation targets V1–V10 | 5 pass, 6 fail, 5 pending data (of 16) | `web/data/validation/summary.json`, `docs/VALIDATION.md` |

## Limitations
One well-mixed cabin zone; 1-D spread per item; spread calibrated on n = 1; **gravity only switches the low-flow quench** (thin-fuel spread does not depend on flow speed and the finite-rate term is not calibrated, so 1/6 g, Mars g and 1 g give the same spread once the flame is above the limit); **no low-pressure flammability limit** (extinction is a flame-temperature check only); partial gravity is an estimate and **may be non-conservative** (FM2); cabin heat loss and smoke/CO are **theory-only (uncalibrated)**; detector thresholds are unsourced (alarm shows *No data*); small n everywhere. **Not for flight certification.**

## Use of AI (SI)
Runtime AI is the OpenAI API, called **server-side only** (`web/lib/ai/client.ts`), rate-limited per IP (8/min) with request size caps (`web/lib/ai/http.ts`). Without `OPENAI_API_KEY` the app runs in **offline mode**: a rule-based interview builds scenarios, and Aster answers from the engine's facts and the bundled PSI catalog, marked "offline". Development used Claude Code (Anthropic) and Codex (OpenAI); every source file carries an `SI-assisted` header naming the tool. Offline answers on a run come from `web/lib/ai/explain.ts` (engine facts only); with a key the model rewrites that draft and must pass the numeric guard against it. No AI-generated images.

## Tech stack
Next.js 15 · React 19 · TypeScript · Tailwind · three.js / React Three Fiber · Plotly · KaTeX · motion · zod / zustand · OpenAI SDK · Vitest + Playwright · Python 3.11 (numpy, scipy, pandas, pdfplumber, pytest). Fonts: Space Grotesk (display), Inter (UI) and JetBrains Mono (numbers), SIL OFL-1.1, self-hosted via @fontsource.

## Run locally
```bash
pnpm -C web install
```
```bash
cp web/.env.example web/.env.local   # optional: add OPENAI_API_KEY; leave empty for offline mode
```
```bash
pnpm -C web dev
```
Checks: `pnpm -C web lint && pnpm -C web typecheck && pnpm -C web test && pnpm -C web build`, `pnpm -C web e2e`; Python: `make venv && make test`.

## Project structure
```
physics/   emberphys (models, source of truth) · pipeline (PSI fetch/ingest, cache-first) · fit · validate · data/*.yaml (every value with source)
shared/    golden_vectors.json (Python ↔ TypeScript parity)
web/       Next.js app: app/ (routes, API) · components/ · lib/sim (engine port) · lib/ai (Aster, guard) · data/ (exported data) · tests/ · e2e/
docs/      STATUS · DECISIONS · DEMO_SCRIPT · HUMAN_TASKS · VALIDATION · PRD · SUBMISSION · PITCH · REFERENCES.json (generated)
```

## Team
Team Max Q (Toronto). Team members are minors, so their names are not published in the app or this repo.

## Credits
NASA Physical Sciences Informatics (PSI) Data Repository, Combustion Science, and NASA NTRS reports (FLEX NASA/TP-2015-216046, SAFFIRE, BASS-II, FM2, LUCI, JSC 20584). Other data and papers: Scientific Reports (BASS-II, 2017), NIST Chemistry WebBook, GRI-Mech 3.0, Incropera, Turns, Quintiere, and the classic flame-spread papers (de Ris 1969; Fernandez-Pello, Ray & Glassman 1981; Olson 1991). Adapted components: BackgroundPaths (21st.dev, MIT) and shadcn/ui primitives (MIT). All libraries with licences: `/credits` and `docs/REFERENCES.json` (generated by `make export`). NASA does not endorse this project. The full list with URLs follows.

## Credits and resources (full list)
Generated from `docs/REFERENCES.json`; the same list is on `/credits`.

### NASA resources
- NASA PSI Data Repository: Combustion Science (Space Apps 2026 challenge Resources tab): https://psi.nasa.gov/physci/repo/search?q=combustion (accessed 2026-11-14)
- NASA Physical Sciences Informatics (PSI) API: https://psi.nasa.gov/geode-py/ws/api/investigations/metadata (Investigation metadata, DOIs, file listings and Experimental tables (GET only))
- NASA Technical Reports Server (NTRS): https://ntrs.nasa.gov (FLEX NASA/TP-2015-216046, JSC 20584 Rev C PDFs)
- Dietrich, D. L., et al., Flame Extinguishment Experiment (FLEX) results, NASA/TP-2015-216046 (Appendix A Table IX; Appendix B per-test captions): https://ntrs.nasa.gov/citations/20150023456
- NASA JSC 20584 Rev C, Spacecraft Maximum Allowable Concentrations (SMACs), 6/13/2024 (CO2 SMACs deleted in this revision): https://ntrs.nasa.gov/citations/20240007713
- NASA-STD-3001 Vol. 2, Human Factors, Habitability, and Environmental Health (CO2 limits; under revision per JSC 20584 Rev C): https://standards.nasa.gov/standard/NASA/NASA-STD-3001-VOL-2
- Exploration atmosphere (34% O2, 8.2 psia) for lunar surface habitats, NTRS 20240003211: https://ntrs.nasa.gov/citations/20240003211
- BASS-II results, NTRS 20160000593: https://ntrs.nasa.gov/citations/20160000593
- BASS-II SIBAL concurrent flame spread, NTRS 20150008962: https://ntrs.nasa.gov/citations/20150008962
- Saffire I-III test matrix and results, NTRS 20180005168: https://ntrs.nasa.gov/citations/20180005168
- Saffire IV-V spacecraft vehicle response to a large-scale fire, ICES 2021, NTRS 20210011521: https://ntrs.nasa.gov/citations/20210011521
- LUCI (lunar-gravity combustion), NTRS 20250010653 - OUTSIDE PSI: https://ntrs.nasa.gov/citations/20250010653
- FM2 (Flammability of Materials on the Moon), NTRS 20240015307 - OUTSIDE PSI: https://ntrs.nasa.gov/citations/20240015307
- NASA Physical Sciences Informatics (PSI) system, Combustion Science: https://psi.nasa.gov
- NASA Orion reference guide (habitable volume ~316 ft3 / 9 m3): https://www.nasa.gov/reference/orion-reference-guide/
- NASA ISS facts and figures (habitable volume 388 m3): https://www.nasa.gov/international-space-station/space-station-facts-and-figures/
- NASA PSI Data Repository: Combustion Science (Space Apps 2026 challenge Resources tab): https://psi.nasa.gov/physci/repo/search?q=combustion
- A Researcher's Guide to International Space Station Combustion Science (challenge Resources tab): https://www.nasa.gov/missions/station/a-researchers-guide-to-combustion-science/

**NASA PSI investigations (25)**, each with its DOI/landing URL:

- PSI-10 Advanced Combustion via Microgravity Experiments / Flame Design: https://doi.org/10.60555/w4zy-bt45
- PSI-20 Advanced Combustion via Microgravity Experiments - Burning Rate Emulator: https://doi.org/10.60555/vb93-3y72
- PSI-21 Advanced Combustion via Microgravity Experiments / Coflow Laminar Diffusion Flame: https://doi.org/10.60555/23e1-9950
- PSI-22 Advanced Combustion via Microgravity Experiments Electric-Field Effects on Laminar Diffusion Flames: https://doi.org/10.60555/se5a-8c73
- PSI-23 Advanced Combustion via Microgravity Experiments-Structure and Response of Spherical Diffusion Flames: https://doi.org/10.60555/k57n-p030
- PSI-25 Burning and Suppression of Solids - II: https://doi.org/10.60555/4qc4-de67
- PSI-26 Burning and Suppression of Solids: https://doi.org/10.60555/58h4-dy80
- PSI-39 Cool Flames Investigation: https://doi.org/10.60555/m6pj-a914
- PSI-47 Dust and Aerosol Measurement Feasibility Test / Dust and Aerosol Measurement Feasibility Test-2: https://doi.org/10.60555/ztgj-d202
- PSI-60 Computational and Experimental Analysis of SPICE Data Sets: https://psi.nasa.gov
- PSI-62 Concurrent Flame Spread Modeling using Flamelet Generated Manifolds in Microgravity with Comparison to BASS Experiments using Two-Color Tomography: https://psi.nasa.gov
- PSI-68 Flame Extinguishment Experiment - 2: https://doi.org/10.60555/byp8-h018
- PSI-69 Flame Extinguishment Experiment: https://doi.org/10.60555/mbq8-0451
- PSI-98 Spacecraft Fire Safety Experiment-I: https://doi.org/10.60555/0t15-1z43
- PSI-99 Spacecraft Fire Experiment-II: https://doi.org/10.60555/2chp-m469
- PSI-100 Spacecraft Fire Experiment-III: https://doi.org/10.60555/040q-4h36
- PSI-101 Smoke Aerosol Measurement Experiment-Reflight: https://doi.org/10.60555/2np7-jv14
- PSI-102 Smoke and Aerosol Measurement Experiment: https://doi.org/10.60555/gd4k-8h62
- PSI-106 Structure and Liftoff In Combustion Experiment: https://doi.org/10.60555/pm12-rg61
- PSI-107 Smoke Point In Co-flow Experiment: https://doi.org/10.60555/9kbh-e962
- PSI-115 Utilization of the Smoke Aerosol Measurement Experiment Data for Advanced Modeling and Simulation of Smoke Generation in Micro-Gravity: https://psi.nasa.gov
- PSI-117 Effect of External Thermo-Convective Perturbation on Cool Flame Dynamics: A Multidimensional Multi-Physics CFD Analysis: https://psi.nasa.gov
- PSI-142 Quantitative Studies of Cool Flame Transitions at Radiation / Stretch Extinction Using Counterflow Flames: https://doi.org/10.60555/80qf-vj95
- PSI-159 Advanced Combustion via Microgravity Experiments / Cool Flames Investigation with Gases: https://doi.org/10.60555/cyt1-kh64
- PSI-179 Aerosol Sampling Experiment: https://doi.org/10.60555/pdgr-c961

### Other data and papers
- GRI-Mech 3.0 thermodynamic data (thermo30.dat), NASA 7-coefficient polynomials: http://combustion.berkeley.edu/gri-mech/version30/files30/thermo30.dat
- NIST Chemistry WebBook, Helium: ideal-gas Cp = 20.786 J/mol/K (monatomic, 5/2 R): https://webbook.nist.gov/cgi/cbook.cgi?ID=C7440597
- IUPAC Standard atomic weights (abridged, 2021): https://iupac.qmul.ac.uk/AtWt/
- NIST Chemistry WebBook, Methanol: enthalpy of vaporization near Tb (~35.2 kJ/mol): https://webbook.nist.gov/cgi/cbook.cgi?ID=C67561
- Westbrook, C. K., Dryer, F. L., Simplified reaction mechanisms for the oxidation of hydrocarbon fuels in flames, Combust. Sci. Tech. 27:31-43 (Table 2): https://doi.org/10.1080/00102208108946970
- Huggett, C., Estimation of rate of heat release by means of oxygen consumption measurements, Fire and Materials 4(2):61-65: https://doi.org/10.1002/fam.810040202
- de Ris, J. N., Spread of a laminar diffusion flame, Proc. Combust. Inst. 12:241-252: https://doi.org/10.1016/S0082-0784(69)80407-8
- Fernandez-Pello, A. C., Ray, S. R., Glassman, I., Flame spread in an opposed forced flow: the effect of ambient oxygen concentration, Proc. Combust. Inst. 18:579-589: https://doi.org/10.1016/S0082-0784(81)80063-X
- Olson, S. L., Mechanisms of microgravity flame spread over a thin solid fuel: oxygen and opposed flow effects, Combust. Sci. Tech. 76:233-249: https://doi.org/10.1080/00102209108951711
- Chao, B. H., Law, C. K., T'ien, J. S., Structure and extinction of diffusion flames with flame radiation, Proc. Combust. Inst. 23:523-531: https://doi.org/10.1016/S0082-0784(06)80299-1
- Dietrich, D. L., Nayagam, V., Hicks, M. C., Ferkul, P. V., Dryer, F. L., Farouk, T., Shaw, B. D., Suh, H. K., Choi, M. Y., Liu, Y. C., Avedisian, C. T., Williams, F. A., Droplet Combustion Experiments Aboard the International Space Station, Microgravity Sci. Technol. 26:65-76: https://doi.org/10.1007/s12217-014-9372-2
- NASA Space Apps Challenge 2026, Flame in Freefall challenge statement (Moon base 30% O2, 70.3 kPa): https://www.spaceappschallenge.org/
- BASS-II PMMA flame spread and limiting O2 in microgravity vs 1 g, Sci. Rep. (2017): https://doi.org/10.1038/s41598-017-18398-4
- White, F. M., Viscous Fluid Flow, 3rd ed., Table 1-2/1-3 (Sutherland constants for air) (no public URL on record yet; docs/HUMAN_TASKS.md #21)
- Bergman, Lavine, Incropera, DeWitt, Fundamentals of Heat and Mass Transfer, 7th ed., Table A.4 (gas properties at 1 atm) (no public URL on record yet; docs/HUMAN_TASKS.md #21)
- Kee et al., CHEMKIN transport (mixture-averaged conductivity: 0.5(sum x k + 1/sum x/k)); Mathur, Tondon & Saxena (1967) Mol. Phys. 12:569 (no public URL on record yet; docs/HUMAN_TASKS.md #21)
- Turns, S. R., An Introduction to Combustion, 3rd ed. (Ch. 10 droplet d2-law; Ch. 9 Burke-Schumann; App. B fuel properties) (no public URL on record yet; docs/HUMAN_TASKS.md #21)
- Beyler, C., Flammability limits of premixed and diffusion flames, SFPE Handbook of Fire Protection Engineering (critical adiabatic flame temperature ~1500-1600 K) (no public URL on record yet; docs/HUMAN_TASKS.md #21)
- Quintiere, J. G., Fundamentals of Fire Phenomena, Wiley (Ch. 7 opposed-flow flame spread; material properties tables) (no public URL on record yet; docs/HUMAN_TASKS.md #21)
- Saffire VI results, ICES-2024-365 (no public URL on record yet; docs/HUMAN_TASKS.md #21)
- Dehghani, P., ACME Burning Rate Emulator (BRE), PhD dissertation, University of Maryland; Combust. Flame 228 (2021) (no public URL on record yet; docs/HUMAN_TASKS.md #21)
- Urban, D. L., et al., Smoke Aerosol Measurement Experiment (SAME/SAME-R), AIAA 2013; Aerosol Sci. Tech. 49 (2015) (no public URL on record yet; docs/HUMAN_TASKS.md #21)
- Seinfeld, J. H., Pandis, S. N., Atmospheric Chemistry and Physics, 3rd ed., Ch. 13 (coagulation kernel, Cunningham slip correction) (no public URL on record yet; docs/HUMAN_TASKS.md #21)
- NFPA 2001, Standard on Clean Agent Fire Extinguishing Systems (cup-burner minimum extinguishing concentrations; n-heptane N2 ~30-34 vol%); Senecal, J. A., Fire Safety J. 40 (2005) 579-591 (no public URL on record yet; docs/HUMAN_TASKS.md #21)
- Drop-tower gaseous-suppressant study finding helium most effective (cited in PRD §2; full reference TODO_VERIFY) - OUTSIDE PSI (no public URL on record yet; docs/HUMAN_TASKS.md #21)

### SI (AI) tools
- Claude Code (Anthropic), model Claude Opus 5.5: https://www.anthropic.com/claude-code. Wrote and refactored the codebase, data pipelines (PDF/PSI table extraction and normalization), tests and documentation under human direction. All generated data rows carry source_id + locator and stay verified=false until a human spot-check.
- Codex (OpenAI): https://openai.com/codex/. Wrote parts of the About page, the Methods equation notes and a landing e2e test under human direction.
- OpenAI API, model from OPENAI_MODEL (default gpt-4o-mini): https://platform.openai.com/docs. Runtime scenario builder (plain English → scenario fields for human review), run interpretation and the experiment-match explanation; grounded only on engine output and cited PSI evidence, checked by a numeric + citation guard. No key → deterministic offline mode (engine facts and catalog records, labelled offline; no invented text).

### Fonts, components, images
- Space Grotesk (OFL-1.1): https://fonts.google.com/specimen/Space+Grotesk
- Inter (OFL-1.1): https://fonts.google.com/specimen/Inter
- JetBrains Mono (OFL-1.1): https://fonts.google.com/specimen/JetBrains+Mono
- shadcn/ui (MIT): https://ui.shadcn.com
- Radix UI Primitives (MIT): https://www.radix-ui.com/primitives
- 21st.dev BackgroundPaths (MIT): https://21st.dev
- Lucide icons (ISC): https://lucide.dev
- Spherical flame around an acrylic sample in the ISS Combustion Integrated Rack (jsc2023e002281), credit NASA (NASA media, not copyrighted (NASA Images and Media Usage Guidelines)): https://science.nasa.gov/biological-physical/stories/how-and-why-do-nasa-researchers-simulate-microgravity-on-earth/
- Saffire-IV fabric burn in Cygnus (jsc2023e046375), credit NASA (NASA media, not copyrighted (NASA Images and Media Usage Guidelines)): https://www.nasa.gov/wp-content/uploads/2023/12/jsc2023e046375medium.jpg
- Candle flame in 1 g vs microgravity (GRC-1998-C-00485), credit NASA Glenn Research Center (NASA media, not copyrighted (NASA Images and Media Usage Guidelines)): https://images.nasa.gov/details/GRC-1998-C-00485
- BASS-II flame on the ISS (iss040e072900), credit NASA (NASA media, not copyrighted (NASA Images and Media Usage Guidelines)): https://images.nasa.gov/details/iss040e072900
- EmberAtlas 3D simulator screenshot (web/public/media/sim-3d.webp), credit Team EmberAtlas (MIT): https://github.com/K4RM-P/flame-in-freefal/blob/main/web/public/media/sim-3d.webp
- EmberAtlas flame logo and Aster mascot, credit Team EmberAtlas (MIT): https://github.com/K4RM-P/flame-in-freefal/blob/main/web/public/logo.png
- NASA Images and Media Usage Guidelines: https://www.nasa.gov/nasa-brand-center/images-and-media/

### Software libraries (54)
[@axe-core/playwright](https://www.npmjs.com/package/@axe-core/playwright) 4.10.2 (MPL-2.0), [@fontsource-variable/inter](https://www.npmjs.com/package/@fontsource-variable/inter) 5.2.8 (OFL-1.1), [@fontsource-variable/jetbrains-mono](https://www.npmjs.com/package/@fontsource-variable/jetbrains-mono) 5.2.8 (OFL-1.1), [@fontsource-variable/space-grotesk](https://www.npmjs.com/package/@fontsource-variable/space-grotesk) 5.2.10 (OFL-1.1), [@paper-design/shaders-react](https://www.npmjs.com/package/@paper-design/shaders-react) 0.0.82 (Apache-2.0), [@playwright/test](https://www.npmjs.com/package/@playwright/test) 1.53.1 (Apache-2.0), [@radix-ui/react-collapsible](https://www.npmjs.com/package/@radix-ui/react-collapsible) 1.2.1 (MIT), [@radix-ui/react-dropdown-menu](https://www.npmjs.com/package/@radix-ui/react-dropdown-menu) 2.2.1 (MIT), [@radix-ui/react-popover](https://www.npmjs.com/package/@radix-ui/react-popover) 1.3.1 (MIT), [@radix-ui/react-slot](https://www.npmjs.com/package/@radix-ui/react-slot) 1.5.0 (MIT), [@radix-ui/react-tooltip](https://www.npmjs.com/package/@radix-ui/react-tooltip) 1.4.1 (MIT), [@react-three/drei](https://www.npmjs.com/package/@react-three/drei) 10.7.9 (MIT), [@react-three/fiber](https://www.npmjs.com/package/@react-three/fiber) 9.8.2 (MIT), [@react-three/postprocessing](https://www.npmjs.com/package/@react-three/postprocessing) 3.2.2 (MIT), [@types/katex](https://www.npmjs.com/package/@types/katex) 0.16.7 (MIT), [@types/node](https://www.npmjs.com/package/@types/node) 22.15.32 (MIT), [@types/react](https://www.npmjs.com/package/@types/react) 19.1.8 (MIT), [@types/react-dom](https://www.npmjs.com/package/@types/react-dom) 19.1.6 (MIT), [@types/react-plotly.js](https://www.npmjs.com/package/@types/react-plotly.js) 2.6.3 (MIT), [@types/three](https://www.npmjs.com/package/@types/three) 0.187.0 (MIT), [autoprefixer](https://www.npmjs.com/package/autoprefixer) 10.4.21 (MIT), [class-variance-authority](https://www.npmjs.com/package/class-variance-authority) 0.7.1 (Apache-2.0), [clsx](https://www.npmjs.com/package/clsx) 2.1.1 (MIT), [katex](https://www.npmjs.com/package/katex) 0.16.22 (MIT), [lucide-react](https://www.npmjs.com/package/lucide-react) 1.73.0 (ISC), [motion](https://www.npmjs.com/package/motion) 12.18.1 (MIT), [next](https://www.npmjs.com/package/next) 15.5.29 (MIT), [openai](https://www.npmjs.com/package/openai) 7.57.0 (Apache-2.0), [plotly.js-dist-min](https://www.npmjs.com/package/plotly.js-dist-min) 3.0.1 (MIT), [postcss](https://www.npmjs.com/package/postcss) 8.5.6 (MIT), [postprocessing](https://www.npmjs.com/package/postprocessing) 6.39.6 (Zlib), [react](https://www.npmjs.com/package/react) 19.1.0 (MIT), [react-dom](https://www.npmjs.com/package/react-dom) 19.1.0 (MIT), [react-plotly.js](https://www.npmjs.com/package/react-plotly.js) 2.6.0 (MIT), [sonner](https://www.npmjs.com/package/sonner) 2.0.8 (MIT), [tailwind-merge](https://www.npmjs.com/package/tailwind-merge) 3.7.0 (MIT), [tailwindcss](https://www.npmjs.com/package/tailwindcss) 3.4.17 (MIT), [three](https://www.npmjs.com/package/three) 0.187.0 (MIT), [tsx](https://www.npmjs.com/package/tsx) 4.20.3 (MIT), [typescript](https://www.npmjs.com/package/typescript) 5.8.3 (Apache-2.0), [vitest](https://www.npmjs.com/package/vitest) 3.2.4 (MIT), [zod](https://www.npmjs.com/package/zod) 3.25.67 (MIT), [zustand](https://www.npmjs.com/package/zustand) 5.0.5 (MIT), [numpy](https://pypi.org/project/numpy/) 1.26.4 (BSD-3-Clause), [scipy](https://pypi.org/project/scipy/) 1.13.1 (BSD-3-Clause), [pandas](https://pypi.org/project/pandas/) 2.2.2 (BSD-3-Clause), [pyarrow](https://pypi.org/project/pyarrow/) 16.1.0 (Apache-2.0), [scikit-learn](https://pypi.org/project/scikit-learn/) 1.5.0 (BSD-3-Clause), [pyyaml](https://pypi.org/project/pyyaml/) 6.0.1 (MIT), [pdfplumber](https://pypi.org/project/pdfplumber/) 0.11.0 (MIT), [tabulate](https://pypi.org/project/tabulate/) 0.9.0 (MIT), [openpyxl](https://pypi.org/project/openpyxl/) 3.1.5 (MIT), [xlrd](https://pypi.org/project/xlrd/) 2.0.1 (BSD-3-Clause), [pytest](https://pypi.org/project/pytest/) 8.2.2 (MIT)


## Licence
MIT (`LICENSE`). Contributions: `CONTRIBUTING.md`.
