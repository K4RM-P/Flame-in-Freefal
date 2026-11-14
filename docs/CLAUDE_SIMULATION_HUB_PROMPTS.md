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
