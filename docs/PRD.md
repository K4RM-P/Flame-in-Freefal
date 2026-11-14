# EmberAtlas — Product Requirements Document (FINAL)

**NASA Space Apps Challenge 2026 · Flame in Freefall: SI-Powered Fire Safety Insights from Microgravity Combustion Data**
Version 2.0 (final) · 2026-11-14 · Supersedes the v1 outline
Submission deadline: **Sunday 2026-11-15, 11:59 p.m. local event time** · Feature freeze: **Sunday 18:00**

---

## 0. TL;DR

EmberAtlas is a **validated, physics-based fire-safety toolkit** built on NASA's PSI microgravity combustion data, with an AI analyst layer on top. Engineers and scientists:

1. pick a crew environment (ISS, Orion, lunar habitat at 34% O₂ and 8.2 psia, pressurized rover, Mars, or custom),
2. run **real combustion models** (flame spread, flammability boundary, droplet burning and extinction, inert suppression, smoke aging and detection, habitat fire consequences) that are **calibrated and validated against PSI experiments** (FLEX, BASS/BASS-II, Saffire, ACME BRE, SAME/SAME-R),
3. see every prediction with its **equation, inputs, uncertainty band, validation error, and validity envelope**, and an explicit warning when they extrapolate,
4. ask a Claude agent that **calls the physics models and data as tools**, so it shows its work and cites PSI sources instead of guessing,
5. get a **ranked evidence base**, an **evidence-gap map**, and a **next-experiment recommender** that uses active learning on the flammability boundary.

The one-liner for judges: *"NASA's 12 TB of microgravity fire experiments, turned into validated engineering models an Artemis designer can run, with a receipt for every number."*

---

## 1. Why this design wins (rubric strategy)

Judges score each criterion from 1 to 5, and all five carry equal weight. v1 (a dashboard and a chatbot) would likely land around 3–4 on Validity and Creativity, because SME judges see many "AI dashboards." v2 targets 5s by being a tool that physicists would actually use.

| Criterion | 5/5 descriptor (official guide) | How v2 earns it |
|---|---|---|
| **Impact** | Significant problem, extensive reach, could change the world | Answers a live NASA question: are materials certified with 1 g tests safe in a 34%/8.2 psia lunar habitat? It quantifies µg and lunar margins, sizes suppression, and predicts habitat consequences. Earth uses: O₂-enriched hospitals, submarines, aircraft, mines. Open-source Python package plus web app |
| **Creativity** | Groundbreaking, never attempted, challenges conventional methods | (a) **Gravity-equivalent-flow mapping** that bounds lunar and Mars flammability from µg plus 1 g data. (b) **Physics-informed probabilistic flammability boundary** merging several ISS experiments. (c) **Active-learning experiment designer** that proposes the next ISS or lunar test points with the most information gain. (d) An AI agent whose tools are physics models, not just documents |
| **Validity** | Scientifically sound, technically feasible, fully developed, usable | Classic, citable combustion theory (de Ris, Burke–Schumann, d²-law, critical flame temperature, Smoluchowski coagulation, oxygen-consumption calorimetry). Every model has **parity plots, error metrics, and validity envelopes** on a Validation Lab page. Unit-tested. Python and TypeScript cross-checked with golden vectors. Deployed and fast |
| **Relevance** | Fully addresses the challenge; NASA data integral | Directly covers all 3 NASA objectives: **Identify** (ranking), **Extract** (data plus export plus models for "predictive modeling of flammability and fire scenarios", the challenge's own words), **Highlight** (design implications for prevention, detection, suppression). Every model is calibrated on PSI data; without PSI there is no app |
| **Presentation** | Polished, compelling storytelling | 30-second video: Artemis II smoke-alarm hook → lunar habitat → the model shows flammability peaking near lunar-g buoyant flow → cited AI answer → "next experiment". A judge-ready README, a Validation Lab screenshot, and a clear project page |

**Global Award targets:** Best Use of Science (primary; the validation-first physics is built for it), Best Use of Data (secondary), Best Mission Concept (stretch).

**Disqualification-proof checklist (do first):** every teammate registered for the same event and on the Members tab (maximum 6; none can be added later) · demo is a video of 30 s or less with English subtitles, or 7 slides or fewer · all fields filled in English · **every** external resource in References (libraries, the Claude API, papers, NASA media) · both checkboxes ticked · **Submit** clicked before the deadline.

---

## 2. The 10 upgrades over v1 (brainstorm result)

Ranked by points gained per build hour. Tier A is required; Tier B is high value; Tier C is a stretch.

| # | Upgrade | Real science | Validated against (PSI) | Rubric lift | Tier |
|---|---|---|---|---|---|
| U1 | **Droplet Combustion Module**: burning rate, flame standoff, extinction diameter, LOI | d²-law with transfer number B; Damköhler (diffusive) and radiative extinction | **FLEX** (284 tests in NASA/TP-2015-216046 Appendix A), FLEX-2, CFI | Validity, Science | A |
| U2 | **Inert Suppression Calculator**: agent fraction (N₂, CO₂, He) needed to extinguish; µg vs 1 g | Critical adiabatic flame temperature (thermal inerting theory) with T-dependent cₚ | **FLEX** LOI with CO₂ and He dilution | Impact, Validity | A |
| U3 | **Solid Flame Spread Model**: opposed-flow spread rate vs O₂, pressure, flow, thickness | de Ris thin/thick theory + Burke–Schumann flame temperature + Damköhler correction | **BASS / BASS-II** (PMMA rods and sheets, SIBAL fabric), **Saffire I–III** | Validity, Science | A |
| U4 | **Gravity-Equivalent Flow Mapping** (Moon and Mars bounding) | Buoyant velocity scale u_b = (g α ΔT/T∞)^(1/3); mixed-convection equivalent flow | µg (BASS-II) + 1 g literature; cross-checked against LUCI and FM2 trends (outside PSI, labelled) | Creativity, Impact | A |
| U5 | **Habitat Fire Consequence Model**: cabin T, P, O₂ depletion, CO₂ and CO rise from a fire of Q kW in volume V | Well-mixed zone model + oxygen-consumption calorimetry (13.1 MJ per kg O₂) + ideal gas | **Saffire IV–VI** vehicle measurements (heat release up to about 10 kW; vehicle T, P and CO₂ response) | Impact, Mission Concept | A |
| U6 | **Validation Lab**: parity plots, RMSE/MAPE, bias, validity envelope, Monte Carlo uncertainty for every model | Standard model V&V practice | All of the above | **Validity (largest single lever)** | A |
| U7 | **Physics-Informed Flammability Boundary**: P(burn \| O₂, P, flow, thickness, g) with uncertainty | Logistic or GP classifier on dimensionless physics features (T_f/T_crit, ln Da, radiative-loss number) | BASS, BASS-II, Saffire extinction/burn outcomes; BRE still-air high-O₂ points | Creativity, Science | B |
| U8 | **Smoke Aging and Detector Module**: particle size growth with transport time; ionization vs photoelectric suitability | Smoluchowski coagulation; moment method (zeroth, first and third moments) | **SAME / SAME-R** (aging 10–1,800 s; averages mostly 200–400 nm) | Impact (detection pillar) | B |
| U9 | **Active-Learning Experiment Designer**: proposes next test points (O₂, P, flow, g) that most reduce boundary uncertainty | GP classifier, uncertainty or BALD sampling | Uses U7 posterior | Creativity (memorable) | B |
| U10 | **Agent-with-physics-tools + Engineering Report export** (Markdown/PDF with equations, inputs, sources) + pip-installable `emberphys` Python package | Tool-grounded LLM; reproducible computation | Golden-question tests | Relevance, Presentation, real-world use | A (agent) / C (package publish) |

> **Science correction from the earlier deep-dive:** don't claim helium is a better suppressant than CO₂ in microgravity. FLEX droplet data show CO₂ dilution raised heptane's LOI to about 0.17, versus about 0.15 with helium; a separate drop-tower foam study found helium most effective. EmberAtlas presents this as **conflicting evidence that depends on configuration** (an evidence gap), which is more valid and more interesting.

---

## 3. Users and jobs

| Persona | Job | EmberAtlas path |
|---|---|---|
| **Habitat or vehicle systems engineer** (Artemis lunar surface) | "Is this fabric or plastic safe at 34%/8.2 psia in lunar gravity with fans on or off? How big a fire can the cabin survive? How much CO₂ to put it out?" | Mission = Lunar Habitat → Flame Spread + Gravity Mapping → Flammability Boundary → Habitat Consequence → Suppression → export Engineering Report |
| **Combustion researcher or grad student** | "Give me validated data and a baseline model for my CFD or theory comparison." | Data Explorer → filter → export CSV/JSON with provenance → Validation Lab parity plots → `pip install emberphys` |
| **PI or program scientist** (next ISS, SoFIE or FM2 test) | "Where is the evidence thin, and which test points matter most?" | Evidence Gaps → Experiment Designer → cited proposal |

**NASA objective mapping:** Identify → Ranking + Evidence Explorer · Extract → Data export + calibrated models ("predictive modeling of flammability and fire scenarios") · Highlight → Design Implications + Suppression/Detection modules + Experiment Designer · Earth add-on → Earth Applications page.

---

## 4. Scope

**In scope (by Sunday 18:00):** Tier A (U1–U6, U10 agent); Tier B if Tier A is green by Sunday 12:00.
**Out of scope:** rocket and propellant combustion (excluded by the challenge); CFD; user accounts; live PSI scraping during the demo; any claim that partial-gravity values are *measured* (PSI has none; they are *bounded estimates*).

---

## 5. Physics specification (the core)

Conventions: SI internally (K, Pa, m, s, kg); the UI shows engineering units (°C, psia/kPa, cm/s, mm/s). Oxygen is always carried as **both** mole fraction X_O₂ and partial pressure p_O₂ = X_O₂·P, plus the mass fraction Y_O₂ where the equations need it. Every model returns `{value, units, uncertainty: {p05, p50, p95}, inputs, equation_ids, assumptions[], validity: {in_envelope: bool, nearest_data_distance}, sources[]}`.

Every property value lives in `physics/data/properties.yaml` with a `source` field. Values below are **typical literature starting points that must be verified against the cited reference** (SFPE Handbook, Quintiere's *Fundamentals of Fire Phenomena*, Turns' *An Introduction to Combustion*, NIST Chemistry WebBook). Uncertain properties get a distribution for the Monte Carlo runs.

### 5.1 Shared thermochemistry (module `thermo`)
- Species cₚ(T) from NASA 7-coefficient polynomials (GRI-Mech 3.0 thermo data, public) for O₂, N₂, CO₂, H₂O, He, Ar, CO.
- Gas transport at film temperature T_film = (T_f + T∞)/2: k_g(T), μ(T) by Sutherland or a tabulated fit for air; α_g = k_g/(ρ_g cₚ). Note ρ_g ∝ P, so α_g ∝ 1/P. **This is how pressure enters most models.**
- Mole ↔ mass fraction conversion for O₂/N₂/diluent mixtures.

### 5.2 Burke–Schumann diffusion-flame temperature (module `flame_temp`)
For fuel (vapor at T_v, Y_F,0 = 1) and oxidizer (Y_O,∞, T∞), with stoichiometric oxygen-to-fuel mass ratio s:

$$Z_{st} = \frac{Y_{O,\infty}}{s\,Y_{F,0} + Y_{O,\infty}}, \qquad T_f = T_\infty + Z_{st}(T_v - T_\infty) + \frac{Z_{st}\,Y_{F,0}\,\Delta h_c}{c_p}$$

Unity Lewis number and no dissociation, so it overpredicts. Use an effective cₚ and an optional calibration factor fitted to data. Report the uncalibrated value too.
Starting fuel data (verify): PMMA as MMA C₅H₈O₂, s ≈ 1.92, Δh_c ≈ 25 MJ/kg, T_v ≈ 630–660 K. Cellulose (cotton) C₆H₁₀O₅, s ≈ 1.18, Δh_c ≈ 16 MJ/kg (effective), T_v ≈ 600 K. n-heptane: s ≈ 3.52, Δh_c ≈ 44.6 MJ/kg. Methanol: s = 1.5, Δh_c ≈ 20 MJ/kg.

### 5.3 Opposed-flow flame spread over solids (module `spread`), U3
de Ris (1969), as presented by Fernandez-Pello and Quintiere:

- **Thermally thin** (fabric, thin sheets; full thickness d, density ρ_s, specific heat c_s):
$$V_{f,thin} = C_{thin}\,\frac{k_g\,(T_f - T_v)}{\rho_s c_s d\,(T_v - T_\infty)}$$
with C_thin = π/4 for full thickness (equivalent to √2 with half-thickness τ = d/2). **Use one convention and document it.**
- **Thermally thick** (PMMA slabs and rods above the thin limit):
$$V_{f,thick} = V_g\,\frac{k_g\rho_g c_g}{k_s\rho_s c_s}\left(\frac{T_f - T_v}{T_v - T_\infty}\right)^2$$
- **Thin/thick switch:** use the heated-layer depth δ_s ≈ α_s/V_f against d; blend smoothly.
- **Finite-rate (high-flow) correction:** Damköhler Da = t_res/t_chem with t_res ≈ α_g/V_r² (V_r = V_g + V_f) and t_chem ∝ [ρ_g Y_O A exp(−E/RT_f)]⁻¹. Then V_f = V_f,deRis · F(Da), where F is a monotone sigmoid in ln Da **fitted** to BASS-II high-flow data (Fernandez-Pello-style correlation).
- **Low-flow radiative quenching:** the model must report a **quench warning** below the empirical low-flow limit (BASS-II flames are sensitive in 0–5 cm/s and survive below 1 cm/s at some conditions). The boundary itself comes from U7.
- **Concurrent flow:** v1 is empirical only. Report the measured BASS/Saffire limiting flame lengths and spread rates as evidence, not as model output, unless time permits a simple pyrolysis-length correlation.

**Calibration:** fit only the effective cₚ (or a T_f factor) plus F(Da) parameters per material class on the training split. Report the held-out error. **Validation targets:** BASS-II PMMA rod spread vs flow (0.4–8 cm/s) and O₂ (15–21%); the µg 17% vs 1 g 18% limiting O₂ result; Saffire SIBAL spread at 20 and 25 cm/s.

### 5.4 Gravity-equivalent flow mapping (module `gravity`), U4
Buoyant velocity scale for opposed spread (Fernandez-Pello; used in Olson's microgravity work):

$$u_b = \left(g\,\alpha_g\,\frac{T_f - T_\infty}{T_\infty}\right)^{1/3}$$

Equivalent relative flow: V_r,eq = |U_forced ± u_b| depending on orientation (opposed downward burning adds; a vector sum for crossflow). Use V_r,eq in §5.3 and §5.7. Built-in g presets: 0 (µg), 0.165 (Moon), 0.378 (Mars), 1.
**Output** a band, not a point: [µg value at the same forced flow, value at V_r,eq], plus the PSI µg evidence near V_r,eq.
**Headline insight to test:** lunar-g u_b at 34% O₂ falls in the few-to-~15 cm/s range where µg opposed spread peaks (BASS-II shows a maximum at intermediate flow). That is consistent with FM2's finding that lunar g can be a "goldilocks" regime with *lower* oxygen limits than Earth. Show LUCI and FM2 as labelled external cross-checks, **never** as PSI data.

### 5.5 Droplet combustion (module `droplet`), U1
Quasi-steady d²-law (Turns):

$$d^2(t) = d_0^2 - K t,\qquad K = \frac{8 k_g}{\rho_l c_{p,g}}\ln(1+B_{O,q}),\qquad B_{O,q} = \frac{\Delta h_c\,Y_{O,\infty}/\nu + c_{p,g}(T_\infty - T_{boil})}{h_{fg}}$$

Flame standoff ratio r_f/r_s = ln(1+B)/ln(1+Y_O,∞/ν).

- **Diffusive extinction** (small droplets): Da_ext = t_flow/t_chem with t_flow ~ r_f²/α_g; calibrate the critical Da on FLEX diffusive-extinction diameters.
- **Radiative extinction** (large droplets): radiative loss fraction ∝ flame volume / heat release ∝ r_f; calibrate the critical radiative-loss fraction on FLEX radiative-extinction diameters.
- **LOI:** the O₂ level where the two extinction diameters meet (FLEX's own definition). Predict and compare: methanol 0.12, heptane 0.15 in O₂/N₂; about 0.14 and 0.17 with CO₂; about 0.14 and 0.15 with He.
- **Cool-flame flag:** for n-alkanes with large d₀ after hot-flame radiative extinction, flag the possibility of a cool flame (FLEX/CFI evidence). Don't model the chemistry.
- Calibrate an effective k_g (or film-temperature rule) on the FLEX training split, since classic theory overpredicts K. Report held-out RMSE of K, extinction diameters, and LOI.

### 5.6 Inert suppression (module `suppression`), U2
Thermal-inerting theory (SFPE cup-burner analysis): a diffusion flame cannot survive if the stoichiometric adiabatic flame temperature falls below T_crit.

$$\sum_i n_i \int_{T_\infty}^{T_{ad}} c_{p,i}(T)\,dT = n_{O_2}\,\Delta H_{O_2},\qquad \Delta H_{O_2} \approx 13.1\ \text{MJ/kg}_{O_2}\ (\approx 419\ \text{kJ/mol})$$

- Solve for the agent mole fraction X_agent at which T_ad = T_crit, for N₂, CO₂ and He added to a given base atmosphere (21%/14.7 psia, 34%/8.2 psia, …).
- 1 g T_crit ≈ 1,500–1,600 K (literature range). **Fit a µg T_crit** to FLEX LOIs. Show both 1 g and µg-calibrated answers and the difference ("µg margin").
- **Explicitly show where pure thermal theory disagrees with FLEX** (agent ranking, CO₂ radiation reabsorption, He diffusivity), and list it as an Evidence Gap with the drop-tower foam study as external, labelled evidence.

### 5.7 Physics-informed flammability boundary (module `boundary`), U7
- Features per test point: θ = T_f,BS/T_crit, ln Da, radiative-loss number Rl = εσ(T_f⁴ − T∞⁴)·L/(k_g(T_f − T_v)) with L = α_g/V_r, ln d (thickness), material class, g via V_r,eq.
- Model 1: L2-regularized logistic regression (interpretable coefficients shown).
- Model 2: GP classifier (scikit-learn, RBF + white kernel) for uncertainty → feeds U9.
- Training data: BASS, BASS-II, Saffire burn/extinct outcomes; BRE steady/extinct vs O₂ (still air). Use grouped cross-validation by investigation.
- Report: ROC-AUC, Brier score, calibration curve; plot the 50% boundary with 10–90% bands on the O₂ × flow map, with the mission point overlaid.
- Export the logistic coefficients and a GP-predictions grid (O₂ 12–45%, flow 0–60 cm/s, g ∈ {0, 0.165, 0.378, 1}, P ∈ {57, 70, 101} kPa) as JSON for the web.

### 5.8 Smoke aging and detection (module `smoke`), U8
Monodisperse-equivalent Brownian coagulation (Smoluchowski):

$$N(t) = \frac{N_0}{1 + \tfrac{1}{2}K_c N_0 t},\qquad d(t) = d_0\left(\frac{N_0}{N(t)}\right)^{1/3}$$

- Fit K_c and N₀ per material and heating condition to the SAME/SAME-R aging series (10–1,800 s) using reported moment-derived diameters.
- Detector suitability: ionization response tracks the first moment (N·d); photoelectric (light scattering) favors larger particles (above ~0.3 µm). Report predicted d₁₀ and d₄₃ at the user's transport time and which detector principle is favored, plus the "mostly 200–400 nm" SAME-R evidence.

### 5.9 Habitat fire consequence (module `habitat`), U5
Closed-volume, well-mixed zone model (the classic spacecraft and compartment approach):

- Energy: m c_v dT/dt = (1 − χ_r,lost)·Q̇(t) − h_w A_w (T − T_w)
- Pressure: P = ρ R T (fixed volume), so ΔP/P ≈ ΔT/T.
- O₂ consumed: ṁ_O₂ = Q̇/ΔH_O₂ (13.1 MJ per kg O₂, Huggett). CO₂ produced from fuel stoichiometry. CO from a material yield y_CO (literature; uncertain, so sample it).
- Inputs: free volume V (presets: Orion, ISS module, lunar habitat module, pressurized rover; values in `missions.yaml` with sources), atmosphere, fire size profile (constant or t² growth to a peak), duration, ventilation or scrubber on/off.
- **Calibrate h_w·A_w** on one Saffire flight; **validate** on the others (vehicle temperature, pressure and CO₂ rise for heat releases up to about 10 kW).
- Output: time histories plus "time to limit" for CO₂ and CO, using exposure limits loaded from `limits.yaml` (NASA SMAC values; Claude Code must look these up from NASA JSC SMAC documents and cite them, never guess).

### 5.10 Uncertainty and validity (module `uq`), U6
- Monte Carlo sampling (N = 1,000, seeded) over property distributions and fitted-parameter covariance, returning p05/p50/p95.
- Validity envelope: the convex hull (or per-feature min/max) of the calibration data in model-input space. When inputs fall outside it, the UI shows an amber "EXTRAPOLATION" badge with the distance to the nearest data point.
- For every model: a parity plot, RMSE, MAPE, bias, n, train/test split, and the list of data rows used (each with `source_id` and `locator`).

### 5.11 Validation targets table (must appear on the Validation Lab page)

| ID | Quantity | Published value | Source | Pass criterion |
|---|---|---|---|---|
| V1 | Heptane droplet LOI in O₂/N₂ (1 atm) | ≈ 0.15 | FLEX (Microgravity Sci. Tech. 2014) | ±0.02 |
| V2 | Methanol droplet LOI in O₂/N₂ | ≈ 0.12 | FLEX | ±0.02 |
| V3 | Heptane LOI with CO₂ dilution | ≈ 0.17 | FLEX | ±0.02 |
| V4 | Methanol LOI with CO₂ dilution | ≈ 0.14 | FLEX | ±0.02 |
| V5 | FLEX burning-rate constant K (held-out tests) | per test | NASA/TP-2015-216046 | MAPE ≤ 20% |
| V6 | PMMA rod limiting O₂ in µg vs 1 g | 17% vs 18% | BASS-II (Sci. Rep. 2017) | Boundary within ±1% O₂ |
| V7 | BASS-II opposed spread rate vs flow (held-out) | digitized | BASS-II | MAPE ≤ 30%; shows peak at intermediate flow |
| V8 | BRE: extinct at 21% O₂ within 40 s; steady at 26.5/34/40% | qualitative | ACME BRE (Dehghani) | Correct classification |
| V9 | Saffire vehicle response to ~10 kW fire | T, P, CO₂ rises | Saffire IV–V (ICES 2021) | Within ±30% (held-out flight) |
| V10 | SAME-R mean particle size after aging | 200–400 nm range | SAME-R | Inside range at matched aging time |

---

## 6. Data plan

### 6.1 Sources (in priority order; every row in the database carries `source_id` + `locator`)
1. **FLEX:** NASA/TP-2015-216046, Appendix A per-test tables (284 tests; pre-tabulated). The fastest high-value dataset.
2. **FLEX LOI summary:** Nayagam/Dietrich et al., *Microgravity Sci. Technol.* 2014 (DOI 10.1007/s12217-014-9372-2).
3. **BASS-II:** Sci. Rep. 2017 (DOI 10.1038/s41598-017-18398-4); NTRS 20160000593; ICES-2019 flammability limits; NTRS 20150008962 (SIBAL concurrent). Figures are digitized with WebPlotDigitizer (flag `digitized: true`, ±5% digitizing uncertainty).
4. **Saffire I–VI:** NTRS 20180005168 (I–III test matrix), NTRS 20210011521 (IV–V vehicle response), ICES-2024-365 (VI).
5. **ACME BRE:** Dehghani dissertation (UMD) + Combustion and Flame 2021 papers.
6. **SAME / SAME-R:** NIST/NASA TM (SAME), AIAA 2013 (SAME-2/R), Aerosol Sci. Tech. 2015.
7. **PSI overview pages** (psi.nasa.gov → Combustion Science): metadata and DOIs for all ~24 investigations, for the ranking and cards. If PSI downloads need an account, a human registers.
8. **One raw PSI dataset** (e.g. a BASS-II or Saffire sensor time series) displayed in the explorer, as proof of direct PSI data use.
9. **External context only (always labelled "outside PSI"):** LUCI (NTRS 20250010653), FM2 (NTRS 20240015307), exploration atmosphere (NTRS 20240003211), NASA-STD-6001, the drop-tower suppressant study.

### 6.2 Schema (`physics/data/*.parquet` → exported `web/data/*.json`)

```
investigation{id, name, acronym, family, fuel_phase, years, platform, objective, approach, hardware,
  fuels[], conditions{o2_range, p_range_kpa, flow_range_cm_s, diluents[]}, variables_varied[], held_constant[],
  sensors[], key_findings[{text, source_id, locator}], pillars[], psi_url, dois[], image{url, credit}}
test_point{id, investigation_id, test_label, fuel, material_class, geometry, thickness_mm, width_cm, d0_mm,
  x_o2, pressure_kpa, p_o2_kpa, diluent, x_diluent, flow_cm_s, flow_dir, gravity_g,
  outcome(burn|extinct|cool_flame|no_ignition|radiative_ext|diffusive_ext),
  spread_rate_mm_s?, K_mm2_s?, d_ext_mm?, d_mean_nm?, aging_s?, hrr_kw?,
  source_id, locator, digitized(bool), verified(bool), split(train|test)}
source{id, type(psi|ntrs|doi|nist|external), title, url, year}
property{material, name, value, units, dist{type, params}, source_id}
model_result{model_id, version, params, metrics{rmse, mape, bias, auc?, brier?}, envelope, parity[]}
```

### 6.3 Pipeline (`physics/pipeline/`, Python, reproducible with `make data`)
`fetch.py` (download PDFs, SHA-256) → `extract_tables.py` (pdfplumber/camelot for FLEX Appendix A) → `extract_llm.py` (Claude with a strict JSON schema for prose and tables, each value with page and a short snippet) → `digitize/` (CSV exports from WebPlotDigitizer, done by a human) → `normalize.py` (units, p_O₂, Y_O₂) → `verify.py` (human sign-off sets `verified`) → `split.py` (grouped train/test) → `build.py` (parquet + JSON + coverage report).
**Rule:** no row reaches the models without `verified = true`.

---

## 7. AI layer (SI)

- **Runtime:** Claude API (Anthropic TypeScript SDK) in a Next.js route, streaming, with tool use. Model: Claude Sonnet 5.5 (`claude-sonnet-5-5`) for the agent; Claude Haiku 5.5 (`claude-haiku-5-5`) for build-time summaries.
- **Tools** (all deterministic, typed, unit-tested):
  - `rank_investigations(mission, weights)`
  - `get_investigation(id)`
  - `query_test_points(filters)`
  - `run_spread(inputs)`
  - `run_droplet(inputs)`
  - `run_suppression(inputs)`
  - `run_boundary(inputs)`
  - `run_habitat(inputs)`
  - `run_smoke(inputs)`
  - `gravity_map(inputs)`
  - `coverage_gaps(mission)`
  - `propose_experiments(mission, n)`
  - `get_sources(ids)`
  - `set_ui(view, filters)`
- **System-prompt rules:**
  - Answer only from tool output.
  - Cite each factual sentence `[S:id]`; give model outputs as `[M:model_id]` with the p05–p95 band.
  - Always state the O₂ basis and units.
  - Say "outside validated range" when the tool says so.
  - Never present partial-gravity values as measured.
  - When evidence conflicts, say so.
- **Guard:** a post-processor checks that every number in the answer appears in tool outputs (to rounding). If not, regenerate once; if it still fails, remove the sentence.
- **Demo resilience:** cached responses for the 12 golden questions, plus a "demo mode" switch. The physics runs client-side in TypeScript, so the app works with no API at all.

---

## 8. App outline (screens)

A persistent **Mission Bar** at the top: preset · O₂ % · pressure · gravity · ventilation flow · free volume. It syncs to the URL.

1. **Mission Brief** (`/`): hook, mission picker, 3 headline model outputs for the mission (e.g. "PMMA limiting O₂ here: 1 g test vs lunar-bounded estimate"), CTA.
2. **Fire Risk Console** (`/console`), the hero screen. Flammability boundary map (O₂ × flow) with the mission point, p50 boundary and 10–90% band, and a gravity toggle (µg/Moon/Mars/1 g) that slides the boundary. Beside it: spread-rate card, suppression card, habitat-consequence mini chart, smoke card. Every card has ⓘ for the equation, inputs, assumptions, validation score, and sources.
3. **Models** (`/models/[spread|droplet|suppression|boundary|habitat|smoke|gravity]`): a full calculator per model with sliders, plots, UQ band, an extrapolation badge, a "Show equations" panel (KaTeX), and "Export report".
4. **Validation Lab** (`/validation`): the §5.11 table with pass/fail, plus a parity plot, metrics and data rows for each model. **This is the screen to show SME judges.**
5. **Evidence Explorer** (`/evidence`): relevance ranking with editable weights, investigation cards (objective, hardware, fuels, conditions, varied/fixed, sensors, findings, sources), compare view, data table with CSV/JSON export.
6. **Gaps and Experiment Designer** (`/gaps`): coverage heat map (O₂ × flow × g × P), conflicting-evidence list (e.g. He vs CO₂), GP-uncertainty map, top-N proposed test points, and an AI-drafted proposal citing them, targeting a real rig (ACME/CIR, SoFIE, FM2).
7. **Ask EmberAtlas** (slide-over everywhere plus `/ask`): agent with tool-call trace ("Ran run_spread with …"), citation pills, "Open in console".
8. **Design Implications** (`/implications`): Prevention / Detection / Suppression cards generated from model outputs plus findings, each with confidence and sources.
9. **Earth** (`/earth`, Tier B): O₂-enriched environments on Earth (hospitals and home oxygen, submarines, aircraft, mines) with the relevant model run, plus NASA spin-offs (water mist, smoke-vs-dust detector, firefighter air tanks and garments).
10. **Methods** (`/methods`): pipeline, equations with references, limitations, license, how to cite, `pip install emberphys`.

Design: dark mission-control theme, one accent (#FF6B35), colorblind-safe (burn = filled ●, extinct = ✕), KaTeX for equations, Plotly for science plots, fast (Lighthouse ≥ 90).

---

## 9. Architecture

```
emberatlas/                 (monorepo, MIT)
  CLAUDE.md
  physics/                  Python 3.11 package "emberphys" (source of truth for science)
    emberphys/{thermo,flame_temp,spread,gravity,droplet,suppression,boundary,smoke,habitat,uq,validity}.py
    pipeline/               data extraction → verified parquet
    fit/                    calibration scripts → model params JSON
    validate/               validation runs → metrics + parity JSON + figures
    tests/                  pytest (analytic limits, units, golden vectors)
    data/                   properties.yaml, missions.yaml, limits.yaml, raw/ (gitignored), processed/
  web/                      Next.js (App Router) + TS + Tailwind + shadcn/ui + Plotly + KaTeX + Zustand
    lib/physics/*.ts        TypeScript ports of closed-form models (fast, client-side)
    lib/ai/*                agent tools, system prompt, guard
    data/                   JSON exported by physics/ (params, grids, test points, validation)
    tests/                  vitest (golden vectors must match Python within 1e-6 relative), playwright smoke
  shared/golden_vectors.json  inputs → outputs generated by Python; TS must reproduce
```

**Why this split:** Python is the trusted scientific source (fits, GP, Monte Carlo, validation). The closed-form models are ported to TypeScript for instant interactivity and offline robustness. GP outputs ship as precomputed grids. Golden vectors make the two languages provably agree. Deploy `web/` on Vercel; `physics/` is pip-installable from GitHub.

---

## 10. Requirements and acceptance criteria

| ID | Tier | Requirement | Acceptance |
|---|---|---|---|
| R1 | A | Mission Bar with presets and custom; URL-synced | All views update in < 200 ms |
| R2 | A | Data pipeline + ≥ 400 verified test points from ≥ 4 PSI investigations | Coverage report; 100% have source_id + locator |
| R3 | A | Droplet module (U1) | V1–V5 pass or the failure is honestly reported with an explanation |
| R4 | A | Suppression module (U2) | V3–V4 compared; 1 g vs µg T_crit shown |
| R5 | A | Spread + gravity modules (U3, U4) | V6–V7; gravity band displayed; extrapolation badge works |
| R6 | A | Habitat module (U5) | V9 on a held-out flight; SMAC limits sourced |
| R7 | A | Validation Lab (U6) | All implemented models have parity + metrics + data rows |
| R8 | A | Agent with physics tools + guard + demo cache (U10) | 12 golden questions pass; zero unsupported numbers |
| R9 | A | Evidence Explorer + ranking + export | ≥ 15 investigations with complete cards |
| R10 | A | Deployed public URL + public repo + README | Loads < 3 s; works in incognito with no API key (demo mode) |
| R11 | B | Flammability boundary (U7) | AUC and Brier reported; grouped CV |
| R12 | B | Smoke module (U8) | V10 |
| R13 | B | Experiment designer (U9) | Top-10 points + AI proposal with citations |
| R14 | B | Earth page | ≥ 4 cases, each with a model run |
| R15 | C | Engineering Report export (MD/PDF) + `pip install` docs | Report includes equations, inputs, UQ, sources |

**Non-functional:** reproducible (`make all` rebuilds data → fits → validation → web JSON); seeded randomness; type-checked (mypy/pyright, tsc strict); WCAG AA; API keys server-side only; NASA public-domain media credited in `CREDITS.md`.

---

## 11. Golden questions (agent tests and demo script)
1. For a 34%/8.2 psia lunar habitat, which PSI investigations matter most and why?
2. Can PMMA burn at lower O₂ in microgravity than in a 1 g test? Show the evidence and the model.
3. Estimate the opposed-flow spread rate over 0.37 mm SIBAL fabric at 34% O₂, 8.2 psia, 10 cm/s, in lunar gravity, with uncertainty.
4. How much CO₂ (mole fraction) would be needed to inert a heptane fire at 21%/14.7 psia vs 34%/8.2 psia? Compare 1 g and µg calibrations.
5. What is heptane's droplet LOI, and how does CO₂ dilution change it?
6. Do flames survive without ventilation at 34% O₂? (BRE + boundary model)
7. A 5 kW fire burns 3 minutes in a 20 m³ rover: what happens to cabin T, P, O₂ and CO₂?
8. What smoke particle sizes reach a detector 2 minutes from the source, and which detector type suits them?
9. Is there lunar-gravity data in PSI? (Answer: no; explain the bounding method.)
10. Is helium or CO₂ the better suppressant in microgravity? (Answer: the evidence conflicts by configuration; show both.)
11. Where is the evidence thinnest for lunar habitats, and what 5 tests would most reduce uncertainty?
12. Compare BASS-II and Saffire on SIBAL fabric: what changes with scale?

---

## 12. Schedule (deadline Sun 23:59; freeze Sun 18:00)

| Window | Physics/data track (Claude Code session 1 + human) | Web/AI track (Claude Code session 2) | Story |
|---|---|---|---|
| Sat 10:00–12:00 | Repo, CLAUDE.md, thermo + flame_temp + tests; FLEX Appendix A extraction | Scaffold web, Mission Bar, data loaders, layout | Registration check; collect NASA media |
| Sat 12:00–17:00 | Droplet + suppression fit and validation (V1–V5); start BASS-II digitizing (human) | Model calculator UI framework, KaTeX, Plotly, validation page shell | Hook and storyboard |
| Sat 17:00–23:00 | Spread + gravity + habitat; Saffire and BRE data; golden vectors | TS ports + vitest vs golden vectors; Console screen | Draft README |
| Sat 23:00–Sun 07:00 | Sleep in shifts; boundary (logistic) + smoke if data is ready | Agent tools + guard + demo cache | Sleep |
| Sun 07:00–12:00 | GP boundary + experiment designer (Tier B); finalize validation JSON | Evidence Explorer, Gaps, Implications | Write project page |
| Sun 12:00–18:00 | Freeze data; Methods page content | Polish, Playwright, deploy, Lighthouse | Screen-record on production |
| **Sun 18:00** | **Feature freeze** | | |
| Sun 18:00–22:00 | Hotfix only | Hotfix only | Edit 30-second video + subtitles; backup 7-slide deck; submission text |
| Sun 22:00–23:00 | | | **Submit**; screenshot confirmation; 1 h buffer |

**Roles:** Lead/PM + submission · Physics lead (models and fits) · Data lead (extraction, digitizing, verification) · Web lead (Claude Code session 2) · Science checker (reviews every equation, claim and caveat) · Storyteller (video, deck, page). One person can hold two roles.

---

## 13. Demo (30-second video)

| t | Visual | VO |
|---|---|---|
| 0–4 s | NASA ISS flame footage; caption "Artemis II, 2026: smoke alarm ~80,000 miles from home" | "In space, fire is the emergency you can't run from." |
| 4–9 s | Lunar habitat; "34% O₂ · 8.2 psia · 1/6 g" | "Moon bases will breathe oxygen-rich air, in a gravity no fire test has fully covered." |
| 9–16 s | Console: gravity toggle µg → Moon; the boundary shifts; "Lunar buoyant flow sits near peak spread" | "EmberAtlas runs combustion physics calibrated on NASA's ISS fire experiments…" |
| 16–22 s | Validation Lab parity plots, green passes | "…validated against FLEX, BASS and Saffire…" |
| 22–27 s | Ask: question → tool trace → cited answer → "Proposed next experiment" | "…answers with receipts, and tells NASA what to test next." |
| 27–30 s | Logo, URL, "Built on NASA PSI data" | "EmberAtlas. Safer air for the next giant leap." |

**Backup 7 slides:** Title · Problem · Solution · Physics (equations + validation) · Live console + agent · Gaps / next experiment · Impact (Artemis + Earth + open source).

---

## 14. Risks

| Risk | Mitigation |
|---|---|
| Data extraction is the long pole | Start with the pre-tabulated FLEX tables; time-box each digitizing job (2 h); ship what's verified and show coverage honestly |
| A model fails validation | Report it honestly in the Validation Lab (this *raises* Validity with SMEs); never tune on test data |
| Overclaiming partial gravity | Bands only, "bounded estimate" labels, external evidence labelled |
| Property values wrong | `properties.yaml` with sources; the science checker verifies; Monte Carlo covers ranges |
| AI hallucination | Tool-only answers, numeric guard, cached demo |
| Time | Tier A only until green; freeze at 18:00; Claude Code prompt enforces time-boxes |
| Submission failure | Checklist in §1; submit by 23:00 |

---

## 15. References (starting list; add every library and asset)
- de Ris, J. N. (1969). Spread of a laminar diffusion flame. *12th Symp. (Int.) on Combustion.*
- Fernandez-Pello, A. C. Flame spread modeling reviews (*Combustion Science and Technology*); Quintiere, J. G., *Fundamentals of Fire Phenomena*.
- Turns, S. R., *An Introduction to Combustion* (d²-law, Burke–Schumann).
- Huggett, C. (1980). Estimation of rate of heat release by means of oxygen consumption measurements. *Fire and Materials.*
- SFPE Handbook of Fire Protection Engineering (thermal inerting, critical flame temperature, yields).
- Olson, S. L. (1991). Mechanisms of microgravity flame spread over a thin solid fuel. *Combust. Sci. Tech.*
- FLEX: Dietrich et al., NASA/TP-2015-216046; Nayagam et al., *Microgravity Sci. Technol.* (2014), DOI 10.1007/s12217-014-9372-2.
- BASS-II: *Sci. Rep.* (2017), DOI 10.1038/s41598-017-18398-4; NTRS 20160000593.
- Saffire: NTRS 20180005168, 20210011521; ICES-2024-365.
- ACME BRE: Dehghani dissertation (UMD); *Combust. Flame* 228 (2021).
- SAME / SAME-R: NIST TM (Yang et al. 2010); Urban et al. AIAA (2013); *Aerosol Sci. Tech.* 49 (2015).
- LUCI: NTRS 20250010653 · FM2: NTRS 20240015307 · Exploration atmosphere: NTRS 20240003211.
- NASA PSI: psi.nasa.gov · NASA Space Apps Judging & Awards Guide (2026).
