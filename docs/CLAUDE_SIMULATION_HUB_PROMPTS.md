# Claude Code prompts — Simulation Hub

Use these prompts from the repository root. Every prompt starts by synchronizing with the latest project state.

## Prompt 1 — Simulation Hub UI and realistic simulation view

```text
Before doing anything, run `git fetch origin && git checkout main && git pull --ff-only origin main`. Work from the latest main. Do not overwrite unrelated user changes; stop and report conflicts.

Build the EmberAtlas Simulation Hub UI quickly and ship working code. This is a spacecraft/lunar-habitat fire simulator, not a generic SaaS dashboard.

Create a desktop-first, no-scroll active workspace inspired by professional Autodesk engineering tools without copying Autodesk branding or assets. Use a fixed application shell: a left project/scenario sidebar, a central simulation viewport, and a right results/AI sidebar. Add a compact top toolbar with project name, scenario, Run/Pause/Reset, timeline, view controls, Compare, and Export.

Make the central simulation look like a realistic technical spacecraft cabin: visible cabin geometry, material sample, flame front, heat region, smoke field, airflow vectors, detector sensing radius, and suppression cloud. Tie all animation to actual simulation time and engine outputs. Do not fabricate telemetry, physics, thresholds, or measurements. Missing values must show No data or remain required inputs. Preserve SI units, provenance receipts, uncertainty bands, colorblind-safe states, reduced-motion support, theory-only labels, and existing manual setup.

Add an AI assistant panel that answers questions about the current scenario and output using only engine results, evidence, telemetry, and provenance. Cite sources. If OpenAI is unavailable, show a useful configuration error and keep the manual simulator fully usable. Never use canned or mock answers.

Keep the main workspace visible without vertical scrolling, preserve performance, run tests/typecheck/build, and commit the finished work to a new branch. Do not merge or push without explicit approval.
```

## Prompt 2 — Project and fire-mitigation dashboard

```text
Before doing anything, run `git fetch origin && git checkout main && git pull --ff-only origin main`. Work from the latest main. Do not overwrite unrelated user changes; stop and report conflicts.

Build the EmberAtlas project dashboard quickly. Use a professional engineering/CAD workspace layout: left navigation rail, fixed top bar, and a desktop-first content workspace that avoids unnecessary scrolling.

Create an empty-project state with manual project creation; never seed mock projects, fake measurements, fake alarms, fake risk scores, or placeholder NASA data. Let users add scenarios manually or through the existing AI builder, compare scenarios, open results, archive scenarios with confirmation, and export evidence.

Include: project overview; scenario list; material and cabin context; fire outcome; alarm and extinguishing status; detector coverage; ventilation; suppression readiness; missing required inputs; theory-only models; evidence coverage; PSI accessions and locators; Monte Carlo bands; Saffire RMSE/MAPE when available; and next-test recommendations. Every unavailable value must display No data, Theory-only, Extrapolation, or Required input.

Add a project AI assistant grounded only in loaded project scenarios, simulation results, evidence, and provenance. Cite every answer and show a clear error when OpenAI is unavailable. The dashboard must remain useful without AI.

Reuse existing design tokens, components, SI conventions, receipts, accessibility rules, manual setup, and no-mock-data policy. Keep physics behavior unchanged unless exposing existing data requires it. Run tests, typecheck, and production build before committing. Commit to a feature branch and report the commit; do not push or merge without explicit approval.
```

## Prompt 3 — Complete NASA Space Apps landing page

```text
Before doing anything, run `git fetch origin && git checkout main && git pull --ff-only origin main`. Work from the latest main. Do not overwrite unrelated user changes; stop and report conflicts.

Build a complete, production-quality landing page for EmberAtlas, a NASA Space Apps Challenge project for Flame in Freefall. Build it quickly, but finish the entire page and ship working code. This landing page should make the project understandable, credible, memorable, and demo-ready within the first 30 seconds.

Use the NASA Space Apps judging criteria as the product standard:

- Impact: clearly explain the fire-safety problem for spacecraft and lunar habitats.
- Creativity: make the NASA PSI data, Saffire replay, simulation, comparison, and mitigation workflow feel distinctive.
- Validity: expose sources, assumptions, uncertainty, theory-only models, and no-data states.
- Relevance: connect the experience directly to Flame in Freefall and the challenge brief.
- Presentation: create a polished visual story that works for judges, engineers, and general audiences.
- Best use of data: prominently show that results trace to NASA PSI accessions, files, rows, and telemetry.
- Best use of science: explain the simulation without pretending theory-only components are validated.
- Best storytelling: guide the visitor from problem → evidence → simulation → decision → next test.

Create a strong landing-page narrative with these sections:

1. Hero
   - Clear headline: what EmberAtlas does and why it matters.
   - Primary CTA: Start a simulation.
   - Secondary CTA: Explore the evidence / View methods.
   - Short statement that every result is traceable to NASA PSI data.
   - Show a real, properly credited rocket, spacecraft, ISS, or NASA fire-experiment image.

2. The problem
   - Explain why fire behaves differently in spacecraft and oxygen-enriched lunar habitats.
   - Explain why Earth testing alone is insufficient.
   - Use concise, readable copy for non-specialist judges.

3. The product workflow
   - Choose a cabin and material.
   - Enter variables manually or ask the AI to draft a sourced scenario.
   - Run the simulation.
   - Review mitigation, evidence, uncertainty, and next tests.
   - Use real screenshots or live UI components from the application where possible.

4. NASA evidence
   - Feature PSI-25, PSI-26, PSI-69, PSI-98, PSI-99, PSI-100, PSI-101, PSI-102, and other actually used accessions only.
   - Explain what each relevant accession contributes.
   - Link to the NASA PSI record or DOI where available.
   - Include the Saffire replay and explicitly say PSI-100 telemetry contains T and P but no O₂ telemetry.

5. Simulation / science
   - Show the central simulation experience as a visual preview.
   - Explain spread, cabin atmosphere, smoke, detection, suppression, Monte Carlo uncertainty, and replay error.
   - Clearly label spread calibration scope and cabin heat-loss/smoke models as theory-only where applicable.

6. Mitigation dashboard preview
   - Show how an engineer sees detection readiness, ventilation, suppression, missing inputs, evidence quality, and next-test recommendations.

7. Trust and limitations
   - Explain SI units, provenance receipts, uncertainty bands, no-data behavior, partial gravity as a bounded estimate, small-n warnings, and the fact that the tool is not flight certification.
   - Never display an invented metric, placeholder measurement, fake NASA quote, or unsupported risk score.

8. Final CTA
   - Start a simulation.
   - View methods and validation.
   - View the repository / project documentation.

Use real images of rockets, spacecraft, ISS, lunar missions, or NASA fire experiments. Source them from NASA or another authoritative public source, preserve the original image URL and attribution, add accessible alt text, and include an image-credit section or per-image credit. Do not use AI-generated rockets, fake NASA imagery, unlicensed stock images, or invented captions. If a suitable image cannot be sourced and credited, use an existing real project asset or no image rather than fabricating one.

Use the 21st.dev components pasted after this prompt where they improve the landing page. Adapt their styling to EmberAtlas rather than blindly importing a conflicting design system. Preserve existing tokens, dark technical visual language, warm orange accent rules, accessibility, reduced motion, and responsive behavior. Do not add unnecessary dependencies. Avoid generic SaaS gradients, fake statistics, decorative dashboards with no data, excessive rounded cards, and ungrounded marketing claims.

The landing page must be excellent on a small laptop, tablet, and mobile. The first viewport must immediately communicate the product and show a credible visual. Use purposeful motion only: subtle scroll reveals, telemetry-like transitions, and simulation previews tied to real content. Respect prefers-reduced-motion.

Add strong SEO metadata, Open Graph metadata, descriptive page structure, keyboard navigation, focus states, contrast-safe text, and accessible image alt text. Make the primary CTA route to the actual simulator.

After implementation:

- Run the existing tests.
- Run TypeScript checking.
- Run the production build.
- Run the Playwright landing-page test if available.
- Check for broken links, missing images, console errors, overflow, and poor mobile layout.
- Do not introduce mock scientific data.
- Commit the finished work to a feature branch and report the commit; do not merge or push without explicit approval.

The 21st.dev components to use/adapt are pasted below. Preserve their useful interaction patterns, but integrate them into the EmberAtlas design system and validate them against the requirements above:

[PASTE THE 21ST.DEV COMPONENTS HERE]
```
