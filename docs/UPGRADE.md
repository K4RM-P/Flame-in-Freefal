# UPGRADE.md: EmberAtlas final upgrade (judge-audit fixes)

Source: a strict judge audit of `main` @ 56a11f7 (2026-11-14). The engine, data and tests are solid. What fails is the product layer: presets don't run, results are flat, the evidence ranking is wrong, the next-test logic is degenerate, there are too many surfaces, the story is weak, and the docs are stale.
Goal: a judge opens the site, understands it in 10 seconds, clicks ONE button, and sees a real NASA-backed finding plus a simulation that clearly says where the data ends.

## The story (every change serves it)

**Maya** is a fire-safety engineer approving cabin materials for a lunar habitat at **34% O₂ · 56.5 kPa · 1/6 g**. NASA approves materials with an Earth-gravity burn test. EmberAtlas answers, from NASA's PSI ISS data:

1. **Does the Earth test hold up in orbit?** SAFFIRE-II like-for-like samples: computed from `web/data/psi/earth_vs_orbit.json`. Currently 7 samples: 4 less flammable in orbit, 3 the same, 0 worse. NEVER hard-code these counts.
2. **Where does the evidence stop?** No solid material in PSI was burned near 34% O₂. Compute the max tested x_O₂ per material from `materials.json`. ACME BRE (PSI-20) is the only flight data at exploration atmospheres, and it's a gas burner that emulates solids.
3. **What if we go beyond it?** The simulator runs the lunar cabin. Every result past the tested envelope carries a visible "extrapolated" badge, and the app proposes the test to fly.

One-liner: **"EmberAtlas shows what NASA's ISS fire experiments prove about cabin materials, where that proof stops, and simulates what lies beyond, so the next test is the right one."**

## P0: must ship (in order)

### 1. Presets run in one click
- Presets must never be blocked by `detection.threshold`. When it's unsourced, the run proceeds and the alarm shows "No data (no sourced detector threshold)". Remove `detection.threshold` from every preset's `required` list and from the UI run gate.
- **ISS volume**: cite NASA's published ISS habitable volume (388 m³) from the NASA "International Space Station Facts and Figures" page, recorded in `missions.yaml` with URL and locator. Remove TODO_VERIFY only if the source is actually cited.
- **Lunar Habitat volume** (unsourced): in the "ISS vs Lunar Habitat" preset, set B's volume equal to A's, with provenance `{source_id: "design input", note: "held equal to Scenario A for a like-for-like comparison"}`. Do the same for "Lunar Habitat: tune the response" (use the ISS value with the same note).
- **Cygnus volume (Saffire replay)**: search `physics/data/sources.yaml`, `saffire_ntrs.yaml` and the Saffire NTRS papers already referenced for a stated Cygnus pressurized or free volume. If one is found, cite it. If none is found within 2 minutes, keep it as the single required field, with the inline hint "Enter the Cygnus free volume (not stated in PSI-100)".
- Acceptance: "ISS vs Lunar Habitat" and "Lunar Habitat: tune" run with zero user input. A vitest asserts that each preset's `required` list contains no `detection.threshold` and that `simulate()` returns without throwing.

### 2. Fix the evidence ranking (`web/lib/sim/evidence.ts`)
- Gate by material class FIRST.
  - spread / cabin roles: investigations that burned THIS material score highest, then the same class (solid fabric/plastic: BASS PSI-26, BASS-II PSI-25, SAFFIRE PSI-98/99/100), then BRE PSI-20 when the mission x_O₂ ≥ 0.26 (labelled "only flight data at exploration atmospheres; gas burner emulating solids").
  - Liquid-droplet investigations (FLEX PSI-69, FLEX-2 PSI-68, CFI PSI-39) appear ONLY under the suppression role, never above solids for a solid material.
  - Smoke role: SAME PSI-102, SAME-R PSI-101, DAFT PSI-47.
- Acceptance: a vitest showing that SIBAL in the Lunar Habitat gives a top 3 that are all solid-fuel investigations (Saffire/BASS), and that PSI-20 is present.

### 3. Fix the envelope and next-test logic (`engine.ts` `envelopeWarnings`, `nextTest.ts`)
- Degenerate tested ranges (min == max) get a tolerance: ±5% for pressure, ±0.01 for x_O₂, ±20% for flow. So "101–101 kPa" covers 96–106 kPa.
- Never warn about, or propose a test for, an input inside the (tolerant) envelope.
- `nextTest`: rank the out-of-envelope inputs by their normalized distance from the envelope. Return null (UI: "Inside the tested envelope, no new test needed for this scenario") when there are none. Remove the misleading "changes the predicted outcome by 100 %" wording. Say instead: "x_O₂ 34% is 12 points above the highest PSI test of SIBAL (22%)".
- Acceptance: the ISS preset gets no pressure warning and no next test. The Lunar preset's next test is O₂ (largest distance) or pressure, phrased with real numbers.

### 4. Cut the surfaces to three
- Nav: **Simulator · Evidence · Methods**. The logo links to `/`. "About" moves to the footer only.
- Remove `/dashboard` (redirect to `/simulator`) and the floating **Aster** launcher (delete it from Shell; delete `components/Aster.tsx`, `app/api/aster`, `lib/ai/localAster.ts` if unused).
- `/match` becomes **Evidence** (`/evidence` route; redirect `/match` → `/evidence`). The page holds:
  - (a) the Earth test vs orbit table (SAFFIRE-II like-for-like, with a counts summary computed from data);
  - (b) the "where the evidence stops" table: per material, the tested O₂, pressure and flow ranges vs the Lunar Habitat;
  - (c) the existing mission-to-experiment match form.
  Keep exactly ONE AI surface per page: the scenario builder plus interpretation in the Simulator, and the match explanation on Evidence. Remove any duplicates (e.g. the workspace "Ask" tab if it duplicates interpretation).
- Delete the dead components left over from earlier screens (RunPanel, ResultPanel, Schematic) if no longer imported. Move any helpers Workspace still imports into `components/sim/bits.tsx` first.

### 5. Remove "Demo Numbers"
Delete the button and `fillDemo` in `components/sim/Onboarding.tsx`, plus any test that references `demo-numbers`.

### 6. The Compare view tells the result
In Compare, show a headline delta card above the charts: "Burnout: ISS 322 s → Lunar 168 s (1.9× faster)". Its values come from `outcomeOf()`, not hard-coded. It carries a large amber **EXTRAPOLATED** badge listing every out-of-envelope input ("O₂ 34% vs tested ≤ 22% · 56.5 kPa vs tested ~101 kPa · 1/6 g bounded"), and a link to the next test.

### 7. Honest replay framing
Rename the replay metric "Cabin-scale sanity check". Add the text: "A sample-size Saffire fire barely changes a vehicle's cabin; the model reproduces that near-ambient response (T RMSE ~6 K, P MAPE ~0.2%), computed live. This is not a test of flame-spread physics." Put the real model check (the spread calibration on held-out SIBAL: 29% error, n = 1) next to it. Show it on Methods too.

### 8. Landing page = the story (`components/landing/LandingPage.tsx`)
Rewrite, in this order:
1. **Hero**
   - Headline: "Will it burn on the Moon?"
   - Subhead: the one-liner.
   - Primary CTA: "Run ISS vs Lunar Habitat" (opens the simulator with that preset and auto-runs it, since the presets are fully sourced). Secondary CTA: "See the NASA evidence".
   - Keep the NASA SoFIE image with its credit.
2. **Maya**: three short lines, before → with EmberAtlas → after.
3. **Finding 1: Earth test vs orbit**: the live counts card, with "SAFFIRE-II, PSI-99, like-for-like samples, small n" as its caveat.
4. **Finding 2: Where the evidence stops**: the highest tested O₂ for a solid in PSI vs the lunar 34% (computed), plus the BRE note.
5. **Finding 3: Simulate beyond it**: one screenshot-free sentence plus the CTA.
6. **Trust strip** (one line each): PSI rows with provenance (count from data), FLEX cross-check 0 mismatches in 1,533 values, held-out FLEX burning rate MAPE 13.3% (n = 66), "Not for flight certification."
- Delete: the "Mitigation review / Missing input" section, the second "headliner" copy, the conceptual SVG diagram, and the repeated caveat lists (keep one compact limitations link).

## P1: docs (required for submission)

Rewrite every doc to match the shipped app exactly. Delete stale claims: Review flow, /review, /start, verdicts, Claude API, demo mode, "only FLEX verified", "figures only", the GIF placeholder.
- **README.md** (≤ 25 lines): the one-liner; the 3 findings; how to run; data (PSI accessions + row counts from data); validation summary (one line each, honest); limitations; use of AI (Claude Code built it; the OpenAI API powers the scenario builder, interpretation and the match explanation); license.
- **docs/SUBMISSION.md**: Title · 150-word summary (the story above) · Demo link TODO · Project link TODO · Detailed description with subheadings *Identify* (evidence ranking + Evidence page), *Extract* (export CSV of PSI rows + time series), *Highlight* (Earth vs orbit, where the evidence stops, next test), *SI* (AI scenario builder + interpretation, grounded, numeric guard) · NASA data (every PSI accession actually used, with file names) · Space-agency partner data: none · Use of AI · References (from `docs/REFERENCES.json`).
- **docs/PITCH.md**: a 30-second script (~75 words, English subtitles):
  1. hook: Artemis II smoke alarm (Aerospace America);
  2. "Moon bases will breathe 34% oxygen. Will the cabin fabric burn?";
  3. Evidence page: "NASA's Earth test held up in orbit for every like-for-like sample";
  4. "but no solid has ever been tested at 34%";
  5. click Run ISS vs Lunar: "burns about twice as fast, and that's an extrapolation";
  6. "so here's the test NASA should fly";
  7. "EmberAtlas. Safer air for the next giant leap."
  Plus a 7-slide outline and a one-line-per-criterion judge map pointing at real routes.
- **docs/STATUS.md**: replace the file with a short current-state summary (done / theory-only / unsourced / skipped).
- Delete `docs/CLAUDE_SIMULATION_HUB_PROMPTS.md` and any other prompt or plan docs. Keep PRD.md, but add a first line: "Historical planning document; see README for the shipped product."
- **About page**: keep the names. For each person, replace the bio with their project role plus at most one relevant sentence. Remove athletics and school details.

## Acceptance (all must pass before pushing)
- `pnpm -C web test` green, with new tests for: presets runnable, the ranking gate, envelope tolerance, nextTest null inside the envelope, no `demo-numbers` in the source.
- `pnpm -C web build` green. If it fails only because Google Fonts can't be fetched offline, note it and continue; the Vercel build has network access.
- The Playwright e2e is updated for the new nav and the flow `/` → "Run ISS vs Lunar Habitat" → delta card with an EXTRAPOLATED badge visible → `/evidence` shows the Earth-vs-orbit counts. Run it if browsers are installed; otherwise note it.
- No hard-coded counts or results in the UI: everything is computed from `web/data` or the engine.
