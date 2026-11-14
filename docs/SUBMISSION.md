# EmberAtlas — NASA Space Apps 2026 Project Submission (draft)

Challenge: **Flame in Freefall**. Deadline: **Sun Nov 15 2026, 11:59 p.m. local time**.
Draft for copy-paste into the Space Apps submission form. Anything marked `TODO_VERIFY` must be filled in or removed before submitting. Do not guess these values.

---

## Project title

**EmberAtlas**

## High-level summary (~150 words)

Lunar habitats are expected to run on an oxygen-enriched cabin atmosphere (34% O₂ at 8.2 psia, NTRS 20240003211). Fire behaves differently there: there is less buoyancy, and the standard Earth flammability test (NASA-STD-6001 Test 1) is run at 1 g. A materials engineer has no fast, defensible way to ask "will this fabric burn in that cabin?" EmberAtlas answers three questions for any material and cabin: Will it burn here? If it burns, how bad? Can we catch it and stop it? Each answer is built from ISS combustion experiments in NASA's Physical Sciences Informatics (PSI) system (FLEX, BASS-II, Saffire, SAME and others) and from NASA technical reports. The physics is checked against those experiments, and every number links to the test rows, equation and source behind it. Each review ends with design actions, the next test to fly (SoFIE in the Combustion Integrated Rack) and an exportable Evidence Brief. EmberAtlas turns NASA's ISS fire experiments into a defensible fire-safety verdict for the materials going into lunar habitats, with every claim traced to the PSI data behind it.

## Demo link

`TODO: 30-second video URL (YouTube/Vimeo, public or unlisted)` — or `TODO: ≤7-slide deck URL`

## Final project link

`TODO: production URL (Vercel deploy pending, docs/HUMAN_TASKS.md #6)` · Repository: `TODO: public repo URL`

---

## Detailed description

### What it does

EmberAtlas is a fire-safety review tool for spacecraft and habitat materials. It is built for **Maya**, a materials and fire-safety engineer who has to decide whether a material can go into a cabin, and defend that decision.

The **Review** screen (`/review`) takes a material and a cabin atmosphere. The default is **Lunar Habitat (34% O₂ · 8.2 psia · 1/6 g) + SIBAL fabric**. It answers three questions:

1. **Q1 — Will it burn here?** A verdict in one of four states.
2. **Q2 — If it burns, how bad?** Flame spread and fire growth, with uncertainty bands (p05/p50/p95).
3. **Q3 — Can we catch it and stop it?** Smoke detection and suppression.

Below the answers the screen shows:
- **Earth test vs orbit:** a strip comparing NASA-STD-6001 Test 1 (upward flame propagation at 1 g) with the ISS test outcomes for the same material. The caveat is fixed: "Under these conditions; not a verdict on the standard."
- **What to do:** prevention, detection and suppression actions.
- **Next test to fly:** the condition with the least coverage that would change the verdict, flown on SoFIE (Solid Fuel Ignition and Extinction) in the ISS Combustion Integrated Rack.
- **Evidence used:** the PSI investigations behind this review, ranked.
- **Export Evidence Brief:** a PDF (through the browser print stylesheet) and a Markdown file.

Navigation: **Review / Evidence Library / Methods & Validation**.

### Verdict rules (Q1)

These are conservative rules, implemented in `web/lib/review/index.ts` with parameters in `web/lib/review/rules.ts`. They are documented on `/methods`.

| Verdict | Rule |
|---|---|
| **Likely to sustain fire** | The material burned (sustained spread) in orbit at x_O₂ ≤ the mission x_O₂, at some tested flow. |
| **Acceptable margin in tested conditions** | Every orbit test at x_O₂ ≥ the mission x_O₂, across 0–30 cm/s flow, was extinct or insignificant, **and** the mission is inside the tested O₂ / pressure / flow envelope. Partial gravity never upgrades a verdict to this state. |
| **Marginal — evidence thin, test needed** | Anything in between, or any mission extrapolated beyond the tested O₂, pressure or flow. |
| **No orbit burn data** | The material is smoke-only or untested. Only Q3 is answered. |

The code also has a fifth state, **Data pending**. It is shown when no verified ISS rows exist yet for the material, and in that state no verdict is given. Partial gravity (Moon, Mars) is always a **bounded estimate between µg and 1 g**. It is never shown as "measured".

### How it works

**Data pipeline** (`physics/pipeline/`, `make data`): this reads NASA technical reports and PSI records. It extracts test rows with `source_id` and `locator`, marks each row verified or unverified, and exports to `web/data/*.json`. Current state, quoted from docs/STATUS.md:
- FLEX Table IX was extracted from NASA/TP-2015-216046: 276 rows, of which 275 are verified (visual spot-check, 0 mismatches; human countersign pending).
- Only **one** investigation (FLEX) has verified rows so far. BASS-II, Saffire, BRE and SAME-R values exist only in figures and are waiting for human digitization. The PRD target of 400 or more rows from 4 or more investigations is **not met**.

**Models** (`physics/emberphys`, Python, the source of truth for the science):
- `thermo`: GRI-Mech 3.0 NASA-7 polynomials
- `flame_temp`: Burke–Schumann
- `spread`: de Ris thin/thick opposed-flow spread with a Damköhler correction
- `gravity`: buoyant-equivalent flow mapping
- `droplet`: d²-law, dual extinction, LOI
- `suppression`: critical adiabatic flame temperature
- `habitat`: well-mixed ODE
- `smoke`: Smoluchowski coagulation
- `uq`: seeded Monte Carlo
- `validity`: envelope check plus nearest-neighbour distance

Every model returns a `ModelResult` with value, units, uncertainty (p05/p50/p95), inputs, equation IDs, assumptions, validity and sources. Calibration (`make fit`) uses verified rows only and never the test split.

**TypeScript port:** the web app runs a TypeScript port of the physics. It is checked against `shared/golden_vectors.json` at rtol 1e-6, and the habitat ODE at 1e-3.

**Validation** (`make validate`, `docs/VALIDATION.md`, `/methods#validation`): results are reported pass/fail, failures included:
- Pass: V2, V4, V5 (droplet) and V3, V4 (held-out thermal suppression).
- Fail: V1 and V3 for the heptane droplet LOI, and the helium LOIs.
- Pending data: V6–V10.

**Ask EmberAtlas:** the Claude API answers questions through 16 deterministic, zod-validated tools. A numeric guard (`web/lib/ai/guard.ts`) rejects any number that is not present in the tool outputs.

### NASA's three objectives

**Identify:** the *Evidence used* panel ranks the PSI investigations relevant to the chosen material and cabin. The ranking uses fuel class, overlap of the tested O₂ / pressure / flow envelope, and nearest tested conditions. The **Evidence Library** (`/evidence`) lists all 16 combustion investigations with their test envelopes, hardware and status.

**Extract:** every result number is a button that opens a **receipt**. The receipt shows the test rows, the rule or equation, the uncertainty band and the source (NTRS report and table/figure locator, or PSI record). **Export Evidence Brief** writes the whole review, with its sources, to PDF and Markdown.

**Highlight:** *What to do* turns the verdict into prevention, detection and suppression design actions. *Next test to fly* names the coverage gap that would change the verdict and the rig that could close it (SoFIE in the CIR). Gaps and failed validations are shown, not hidden.

### Benefits and intended impact

- Materials and fire-safety engineers get a first-pass, traceable screen of cabin materials for the Artemis-era 34% O₂ atmosphere. It does not replace NASA-STD-6001 testing. It shows where the Earth test and orbit behaviour disagree.
- Mission planners get a short list of the tests that would reduce the most uncertainty.
- Students and researchers get a navigable entry point into the PSI combustion archive.

### Tools and languages

Python 3.11 (numpy, scipy, pandas, pyarrow, scikit-learn, PyYAML, pdfplumber, pytest). TypeScript, Next.js 15, React 19, Tailwind CSS, Plotly, KaTeX, Motion, Zustand, Zod, Vitest, Playwright with axe-core. Anthropic Claude API. Make and pnpm. Vercel for hosting.

### Limitations (stated in the product, not softened)

- Only FLEX has verified rows. The solid-material verdicts, including SIBAL, depend on BASS-II and Saffire data that still has to be digitized and verified (TODO_VERIFY (data instance)). Until then the Review shows **Data pending** rather than a verdict.
- Spread, habitat and smoke models are **uncalibrated** (theory-only), and the UI labels them as such.
- The heptane droplet LOI is under-predicted, and the effect of helium is not captured. Both are failed validations.
- There is no burn-probability boundary model, so no p value is shown.
- Partial gravity is a bounded estimate only. There are no lunar-gravity data from PSI. LUCI and FM2 are cited as **outside PSI**.
- Uncertainty bands for single tests are overconfident: the reliability dial reads 20%.
- The live Claude path has not been tested against the real API. The demo uses cached answers composed offline from tool outputs, and these are labelled as such.

### Future work

- Digitize and verify the BASS-II, Saffire I–VI, BRE and SAME-R data.
- Calibrate spread and smoke against that data.
- Build a physics-informed burn/extinct boundary and a GP experiment designer.
- Ingest lunar-gravity results (LUCI, FM2) when they are released.
- Get the NASA-STD-6001 comparisons reviewed by a materials test lab.

---

## NASA data

All PSI records are from the Physical Sciences Informatics system, Combustion Science (https://psi.nasa.gov). Accession numbers have not yet been recorded in the repo (`web/data/investigations.json` → `status: TODO_VERIFY`). Each one must be filled in from PSI before submitting. The rules require every PSI record to be cited by ID.

| Key | PSI investigation | Years | Contribution to EmberAtlas | PSI accession |
|---|---|---|---|---|
| FLEX | Flame Extinguishment Experiment | 2009–2011 | **Verified data:** 276 rows (275 verified) from Table IX. Calibrates the droplet and suppression models, and is used for validations V1–V5. | TODO_VERIFY (data instance) |
| FLEX-2 | Flame Extinguishment Experiment 2 | 2012–2016 | Evidence Library entry; liquid-fuel envelope | TODO_VERIFY (data instance) |
| CFI | Cool Flames Investigation | 2016–2019 | Evidence Library entry; liquid-fuel envelope | TODO_VERIFY (data instance) |
| BASS | Burning and Suppression of Solids | 2011–2012 | Solid-material envelope, Evidence ranking | TODO_VERIFY (data instance) |
| BASS-II | Burning and Suppression of Solids II | 2012–2013 | Main source for SIBAL and PMMA burn/extinct outcomes; awaiting digitization | TODO_VERIFY (data instance) |
| SAME | Smoke Aerosol Measurement Experiment (SAME / SAME-R) | 2008–2016 | Q3 smoke/detection context; awaiting digitization | TODO_VERIFY (data instance) |
| Saffire-I-III | Spacecraft Fire Safety Experiment I–III | 2016–2017 | Large-scale SIBAL fabric burns; Q2 context | TODO_VERIFY (data instance) |
| Saffire-IV-VI | Spacecraft Fire Safety Experiment IV–VI | 2019–2021 | Vehicle response, flammability limits; Q2/Q3 context | TODO_VERIFY (data instance) |
| ACME-BRE | ACME Burning Rate Emulator | 2017–2020 | Gas-surrogate burning rate; awaiting digitization | TODO_VERIFY (data instance) |
| ACME-sFlame | ACME s-Flame | 2017–2020 | Evidence Library entry | TODO_VERIFY (data instance) |
| ACME-CLD | ACME Coflow Laminar Diffusion Flame | 2017–2020 | Evidence Library entry | TODO_VERIFY (data instance) |
| ACME-FlameDesign | ACME Flame Design | 2017–2020 | Evidence Library entry | TODO_VERIFY (data instance) |
| ACME-EFIT | ACME E-FIT | 2017–2020 | Evidence Library entry | TODO_VERIFY (data instance) |
| SoFIE | Solid Fuel Ignition and Extinction | 2022– | Recommended rig for the "Next test to fly" | TODO_VERIFY (data instance) |
| SPICE | Smoke Point In Coflow Experiment | 2010–2012 | Evidence Library entry | TODO_VERIFY (data instance) |
| SLICE | Structure and Liftoff In Combustion Experiment | 2012 | Evidence Library entry | TODO_VERIFY (data instance) |

**NASA Technical Reports Server and other NASA documents** (from `web/data/sources.json`):
- NASA/TP-2015-216046, FLEX results (Dietrich et al.), NTRS 20150023456
- BASS-II results, NTRS 20160000593
- BASS-II SIBAL concurrent flame spread, NTRS 20150008962
- Saffire I–III test matrix and results, NTRS 20180005168
- Saffire IV–V spacecraft vehicle response to a large-scale fire, ICES 2021, NTRS 20210011521
- Saffire VI results, ICES-2024-365 (NTRS id TODO_VERIFY)
- Exploration atmosphere (34% O₂, 8.2 psia) for lunar surface habitats, NTRS 20240003211
- JSC 20584 Rev C, Spacecraft Maximum Allowable Concentrations, NTRS 20240007713
- NASA-STD-3001 Vol. 2 (standards.nasa.gov)
- LUCI (lunar-gravity combustion), NTRS 20250010653, **outside PSI**
- FM2 (Flammability of Materials on the Moon), NTRS 20240015307, **outside PSI**
- NASA Orion reference guide; NASA ISS facts and figures (habitable volumes)

## Space Agency Partner data and other data

- **Space agency partner data: none used.**
- Other (non-agency) data, each cited in-app:
  - GRI-Mech 3.0 thermodynamic data
  - NIST Chemistry WebBook (helium, methanol)
  - IUPAC atomic weights
  - NFPA 2001 cup-burner values
  - Textbook property tables (White; Bergman et al.; Turns; Quintiere; Seinfeld & Pandis)
  - The peer-reviewed papers listed under References
  - One drop-tower helium study whose full reference is still TODO_VERIFY

## Use of AI/SI tools

- **Code:** the code was written with **Claude Code** (Anthropic), directed and reviewed by the team. Commits carry a Co-Authored-By trailer.
- **In-product AI:** *Ask EmberAtlas* uses the **Anthropic Claude API** (`@anthropic-ai/sdk`) in a tool-use loop over 16 deterministic tools. Answers are grounded only on tool outputs. `web/lib/ai/guard.ts` rejects any number that does not appear in the tool output: the answer is regenerated once, then the number is stripped. The demo uses cached answers composed offline from tool outputs, and they are labelled as such in the UI.
- **Science:** no AI is used to produce physics values. The models are deterministic Python, ported to TypeScript and checked against golden vectors.
- **Media:** **no AI-generated images, video or audio** appear in the product or the demo. Any that are added later must carry a visible "AI-generated" watermark and be listed here.

---

## References

### Software: web (`web/package.json`; licences read from `node_modules/<pkg>/package.json`)

| Package | Version | Licence |
|---|---|---|
| @anthropic-ai/sdk | 0.54.0 | MIT |
| katex | 0.16.22 | MIT |
| motion | 12.18.1 | MIT |
| next | 15.5.29 | MIT |
| plotly.js-dist-min | 3.0.1 | MIT |
| react | 19.1.0 | MIT |
| react-dom | 19.1.0 | MIT |
| react-plotly.js | 2.6.0 | MIT |
| zod | 3.25.67 | MIT |
| zustand | 5.0.5 | MIT |
| @axe-core/playwright (dev) | 4.10.2 | MPL-2.0 |
| @playwright/test (dev) | 1.53.1 | Apache-2.0 |
| @types/katex (dev) | 0.16.7 | MIT |
| @types/node (dev) | 22.15.32 | MIT |
| @types/react (dev) | 19.1.8 | MIT |
| @types/react-dom (dev) | 19.1.6 | MIT |
| @types/react-plotly.js (dev) | 2.6.3 | MIT |
| autoprefixer (dev) | 10.4.21 | MIT |
| postcss (dev) | 8.5.6 | MIT |
| tailwindcss (dev) | 3.4.17 | MIT |
| tsx (dev) | 4.20.3 | MIT |
| typescript (dev) | 5.8.3 | Apache-2.0 |
| vitest (dev) | 3.2.4 | MIT |

### Software: physics (`physics/pyproject.toml`; emberphys itself is MIT)

The licences below are each project's published licence. They were not read from installed metadata, so they should be confirmed with `pip show`.

| Package | Version | Licence |
|---|---|---|
| numpy | 1.26.4 | BSD-3-Clause |
| scipy | 1.13.1 | BSD-3-Clause |
| pandas | 2.2.2 | BSD-3-Clause |
| pyarrow | 16.1.0 | Apache-2.0 |
| scikit-learn | 1.5.0 | BSD-3-Clause |
| PyYAML | 6.0.1 | MIT |
| pdfplumber (pipeline) | 0.11.0 | MIT |
| tabulate (pipeline) | 0.9.0 | MIT |
| pytest (dev) | 8.2.2 | MIT |

### APIs and services

- Anthropic Claude API (Ask EmberAtlas)
- NASA PSI (psi.nasa.gov)
- NASA NTRS (ntrs.nasa.gov)
- Vercel (hosting; deploy pending)

### Papers and data references (from `web/data/sources.json`)

- Aerospace America (AIAA), "Artemis II astronauts praise Orion capsule, reflect on mission impact": https://aerospaceamerica.aiaa.org/artemis-ii-astronauts-praise-orion-capsule-reflect-on-mission-impact/ (hook citation)

- Dietrich et al., Droplet Combustion Experiments Aboard the ISS, Microgravity Sci. Technol. 26:65–76 (2014), doi:10.1007/s12217-014-9372-2
- BASS-II PMMA flame spread and limiting O₂ in µg vs 1 g, Sci. Rep. (2017), doi:10.1038/s41598-017-18398-4
- de Ris, Spread of a laminar diffusion flame, Proc. Combust. Inst. 12:241–252 (1969), doi:10.1016/S0082-0784(69)80407-8
- Fernandez-Pello, Ray & Glassman, Proc. Combust. Inst. 18:579–589 (1981), doi:10.1016/S0082-0784(81)80063-X
- Olson, Combust. Sci. Tech. 76:233–249 (1991), doi:10.1080/00102209108951711
- Chao, Law & T'ien, Proc. Combust. Inst. 23:523–531 (1990), doi:10.1016/S0082-0784(06)80299-1
- Westbrook & Dryer, Combust. Sci. Tech. 27:31–43 (1981), doi:10.1080/00102208108946970
- Huggett, Fire and Materials 4(2):61–65 (1980), doi:10.1002/fam.810040202
- Beyler, SFPE Handbook (2016)
- Quintiere, Fundamentals of Fire Phenomena (2006)
- Turns, An Introduction to Combustion, 3rd ed. (2012)
- White, Viscous Fluid Flow, 3rd ed. (2006)
- Bergman et al., Fundamentals of Heat and Mass Transfer, 7th ed. (2011)
- Kee et al., CHEMKIN transport (1986)
- Mathur, Tondon & Saxena, Mol. Phys. 12:569 (1967)
- Seinfeld & Pandis, Atmospheric Chemistry and Physics, 3rd ed. (2016)
- Dehghani, ACME BRE dissertation; Combust. Flame 228 (2021)
- Urban et al., SAME/SAME-R, AIAA 2013; Aerosol Sci. Tech. 49 (2015)
- GRI-Mech 3.0 (Smith et al.)
- NIST Chemistry WebBook
- IUPAC atomic weights (2021)
- NFPA 2001; Senecal, Fire Safety J. 40 (2005) 579–591
- NASA-STD-6001 (Test 1, upward flame propagation): full citation TODO_VERIFY

---

## Submission checklist

- [ ] Project title entered
- [ ] High-level summary entered (English)
- [ ] Demo link: ≤30 s video **or** ≤7 slides, publicly viewable
- [ ] Final project link (deployed app and/or public repo)
- [ ] Detailed description entered
- [ ] NASA data section: every PSI record cited by its ID (fill all `TODO_VERIFY (data instance)` accessions)
- [ ] Space Agency Partner data section ("none")
- [ ] Use of AI/SI tools disclosed (Claude Code, Claude API; no AI-generated media)
- [ ] References: all libraries, APIs, papers and media
- [ ] Challenge selected: Flame in Freefall
- [ ] Team members confirmed on the team page
- [ ] Required agreement/terms checkboxes ticked (exact list TODO_VERIFY from the live form)
- [ ] Submitted before **Sun Nov 15 2026, 11:59 p.m. local time**

## Rules reminders

- Demo is **≤30 seconds of video or ≤7 slides**.
- **English only**, including burned-in subtitles.
- **Cite each PSI record by its ID.**
- **No NASA logos** (meatball, worm or insignia) anywhere in the app, video or slides. NASA public-domain imagery may be used with credit and a "NASA does not endorse this project" note (CREDITS.md).
- Never call partial-gravity results "measured". Label all data from outside PSI "outside PSI".
