# EmberAtlas: full audit and upgrade plan (2026-11-16)

Scope: `main` @ `7ebf593` (same as the working branch at the start). Scores are 1–5 against the five Space Apps judging
criteria: **I**mpact, **C**reativity, **V**alidity, **R**elevance, **P**resentation. Evidence is a file:line, a command
output, or a screenshot description (screenshots were taken in headless Chromium at 1440×900 and 390×844 against `pnpm start`).

## 0. Toolchain baseline

| Check | Result |
|---|---|
| `pnpm install` | ok |
| `pnpm lint` | ok, but `lint` is an alias of `tsc --noEmit` (`web/package.json`): there is no real linter |
| `pnpm typecheck` | ok |
| `pnpm test` (vitest) | 97 passed, 3 skipped |
| `pnpm build` | ok. `/simulator` First Load JS **608 kB** (340 kB page) |
| `make test` (pytest) | **1 failed** / 20 passed: `test_submission_hygiene`. 15 source files lack the required "SI-assisted" header (`web/app/api/aster/route.ts`, `web/app/api/translate/route.ts`, `web/components/Aster.tsx`, `web/lib/ai/localAster.ts`, `web/lib/ai/asterContext.ts`, …) |
| Playwright e2e | with the repo's pinned 1.53 and the sandbox Chromium (`PW_CHROMIUM=…`). See §10 |
| Vercel | Project `flame-in-freefal` (prod alias `flame-in-freefal.vercel.app`) deploys `main`; last prod deploy READY on `7ebf593`. **No environment variables** set (no `OPENAI_API_KEY`). `emberatlas-five.vercel.app` is **not** in this Vercel account and the README links a different URL |

## 1. Science and engine (I 3 · C 4 · V 3 · R 5 · P 3)

**Good**
- `web/lib/sim/engine.ts` composes sourced sub-models (spread, gravity, habitat, smoke, suppression). Every property is read from `web/data` with provenance. It is deterministic (seeded MC), extrapolation is labelled (`envelopeWarnings`, engine.ts:404), and sub-models that are not calibrated are flagged as theory-only (engine.ts:332).
- Python ↔ TS parity: `shared/golden_vectors.json` covers thermo, flame temperature, droplet, suppression, spread, gravity, smoke and habitat. `tests/golden.test.ts` passes.
- Validation numbers in the UI match `web/data/validation/` and `params/spread.json`: FLEX MAPE 13.3 % (n = 66), SIBAL spread 29.3 % (n = 1), 0 mismatches in 1,533 values.

**Problems (edge-case runs on the lunar preset, `scripts/_edge.ts`, run during the audit)**

| Input | Result | Verdict |
|---|---|---|
| no items | no fire, no NaN | ok |
| x_O₂ = 0 / 0.15 | inerting, no fire | ok |
| x_O₂ = 1.0 | burns out at 50.5 s, 16.6 kW | ok (labelled out of envelope) |
| **thickness = 0** | **every state value NaN** | bug: no input validation |
| **flow < 0** | silently treated as quench | bug: no input validation |
| **P = 1 kPa** | still burns (259 s) | no low-pressure or ppO₂ flammability limit is modelled (only the T_ad inerting check). The result is flagged out of envelope, but Methods does not say it |
| **g = 0.165 / 0.38 / 1.0** | **identical** (out at 171 s, 4.9 kW) | Thin-fuel de Ris spread does not depend on flow speed, and the finite-rate term `mu` is not calibrated (`params/spread.json` `mu: null`). So gravity only switches the 5 cm/s low-flow quench on or off. This is defensible, but it is not disclosed: a judge who changes 1/6 g to 1 g sees no change and loses trust |
| g = 0 with the fan off | quench at 30 s | This is the headline ISS result, and it rests on `low_flow_quench_cm_s = 5.0`, which is `TODO_VERIFY` (`physics/data/properties.yaml:108`). Not shown next to the result |

- Spread is "calibrated" on **one** flight sample (SAFFIRE-I I-2) and tested on one (III-2). Concurrent spread is not modelled, but the Saffire-replay preset is concurrent flow (30 cm/s). The landing "CALIBRATED" chip (Bento, fix #2) does not say n = 1.
- The Saffire replay ("real NASA fire") cannot run on first click: it needs a Cygnus free volume that has no source (screenshot: "Inputs needed · Enter cabin free volume"). This is the right call (no guessing), but it is a dead end for a judge.

## 2. NASA data use (I 4 · C 3 · V 4 · R 5 · P 3)

- 2,818 PSI rows from 18 accessions, each with accession + file + line (`web/data/psi/tables_index.json`), PSI-100 telemetry for the replay, and the FLEX TP cross-check. Deep and traceable.
- **Used in the engine:** PSI-98/99/100 (SIBAL geometry, O₂, spread calibration), PSI-25 BASS-II (quench limit source), PSI-69 FLEX (droplet K), PSI-20 ACME BRE (envelope), PSI-101/102/47 (smoke).
- **Catalogued but barely used:** PSI-10/22/23/39/142/159 (ACME gas flames, cool flames) appear only in the dataset list and the evidence ranking. PSI-107 SPICE (469 rows) is used for nothing visible. That is honest, but nothing shows the *tested envelope* per material.
- `materials.json` already has per-material O₂ / flow / thickness ranges, but the only view of them is one bar chart on the landing (highest O₂). There is no explorer.

## 3. Simulator UX (I 3 · C 4 · V 3 · R 4 · P 3)

- Desktop (1440×900): the 3D Compare view renders and the verdict strip reads "Lunar Habitat burns out 5.7× slower · ISS 30 s → Lunar Habitat 171 s · EXTRAPOLATED". **"Burns out slower" is wrong:** the ISS fire is *quenched* (fan off, no buoyant flow) at 30 s, while the lunar fire *burns the whole sample* at 171 s. Each fire ends for a different reason, and the verdict does not say so.
- **Phone (390×844): the 3D canvas is stuck at 300/358×150 px** inside a 358×506 viewport, so the rest of the viewport is black (screenshot `m__simulator_preset_lunar_tune_run_1`). Root cause: `.viewport3d` (Workspace.tsx:401) has only `min-h-[60vh]`, so the child `h-full` (Scene3D.tsx:50) resolves to auto.
- **Phone: the main nav is clipped** ("Sim…" shown, other links scrolled off) because the language `<select>` takes about 95 px (Shell.tsx:51). The Ask Aster pill also overlaps the footer text.
- Apply & re-run (`DesignReview.tsx:21`) opens an A/B compare, but there is **no "what changed" diff**: the user must compare two HUDs by eye. Sensitivity-lever fixes have no Apply button (STATUS "known gaps").
- Performance: page load 140–400 ms locally. First Load JS for `/simulator` is 608 kB (Plotly + three are not lazily split). FPS could not be measured (no GPU).

## 4. AI: Build with AI, Analyst, Aster (I 3 · C 4 · V 2 · R 3 · P 3)

- **Aster is not run-aware.** `AskAsterButton` (the only dispatcher of `ASTER_CONTEXT_EVENT`) is used on Methods formula cards and the Evidence match, but the simulator imports it and never renders it (`Workspace.tsx:8`). So on the simulator Aster posts `document.body.innerText` as a *string* context, and `/api/aster` then does catalog keyword search (`lib/ai/localAster.ts`).
  - Reproduced: "Why does the Moon fire last longer?" → **PSI-26 BASS only**. The answer is "These NASA records are the closest matches…" with no run numbers, so the guard reports **"0 numbers checked"**. Saffire (PSI-98, the fabric that burned), BASS-II (PSI-25, the quench limit) and FM2 (NTRS 20240015307) are never cited. This is exactly the failure named in the brief.
  - Ranking is term overlap with a stop-word list. "fabric … lunar gravity" → PSI-20/25. "moon", "lunar", "partial gravity" and "extinguisher" have no synonyms.
- The Analyst drawer *is* run-aware (`/api/interpret`), but offline it returns the same generic summary for every non-what-if question (`lib/ai/localInterpret.ts`). It ignores the question.
- The numeric guard (`lib/ai/guard.ts`) and the citation whitelist are solid. Offline mode never errors (`tests/ai-offline.test.ts`).
- Citations are plain text chips. They do not open the Evidence entry (`/evidence#psi-25` anchors exist, but nothing links to them).

## 5. Methods and Evidence pages (I 3 · C 3 · V 4 · R 4 · P 3)

- Methods (`app/methods/page.tsx`) is complete: equations with KaTeX, validation tally, limitations, data, 3D mapping, use of AI and references. But it is 22.7k characters with **no search**. "Find a formula" and "Find a source" are just anchor links.
- Evidence has a scroll-spy TOC, filter chips and PSI anchors, but **no search** and no envelope chart.
- Limitations do not state that gravity only enters through the quench threshold, or that no low-pressure limit is modelled.

## 6. Landing, About and credits (I 4 · C 4 · V 3 · R 4 · P 4)

- A judge understands it in 5 s: "The firefighter for space", with a primary CTA that runs the Moon-base fire in one click.
- Claims that need fixing (full list in §9): "18 ISS fire experiments" (SAFFIRE flew on Cygnus, and DAFT/SAME are smoke experiments); "5 of 16 pass" (5 targets are *pending data*, so only 11 were checked); "burns out 5.7× slower".
- Credits: `CREDITS.md` is 6 lines. There is **no credits page**, and the About page says "Images: NASA. Full list in CREDITS.md and docs/REFERENCES.json". `docs/REFERENCES.json` misses about 11 runtime libraries (`@react-three/fiber`, `drei`, `postprocessing`, Radix, `sonner`, `lucide-react`, `geist`, `clsx`, `tailwind-merge`, `class-variance-authority`, `@paper-design/shaders-react`), the fonts and component sources (shadcn/ui). Space Apps requires every resource with a full URL.
- **Fonts:** the brief and CLAUDE.md name Space Grotesk / Inter / JetBrains Mono. The code ships Geist Sans/Mono (`app/layout.tsx:3-4`), and the README documents Geist.
- No demo video link (needs `TODO_VIDEO_URL`). The landing hero image is hot-linked from nasa.gov (HUMAN_TASKS #14).

## 7. Repo quality (I – · C – · V 3 · R – · P 3)

- MIT licence, README, PRD, STATUS, VALIDATION, DEMO_SCRIPT, HUMAN_TASKS: good docs discipline. No secrets found (`grep sk-…`; `tests/secrets.test.ts`).
- Problems: the README live URL is not the one the team uses; the Python hygiene test fails; `pnpm lint` is not a linter; `docs/UPGRADE.md`, `HANDOFF_UI.md` and `PITCH.md` partly overlap with SUBMISSION and STATUS; `lib/store.ts` (the old mission store) is still imported by Shell/Plot.
- Branches: only `main` and this working branch on origin (clean).

## 8. Accessibility, performance, mobile, SEO (P 3)

- axe contrast tests exist for 3 pages. Reduced motion is respected.
- Mobile: the 3D canvas bug and the clipped nav (above).
- SEO: titles, descriptions and OG exist. **No `robots.txt` or `sitemap.xml`**, no `metadataBase` (OG image URLs are relative), and the OG image is a hot-linked NASA URL.

## 9. Claims register

| Where | Claim | Backed? |
|---|---|---|
| Landing hero strip | "18 ISS fire experiments" | **Partly.** 18 PSI accessions, but SAFFIRE flew on Cygnus and DAFT/SAME/SAME-R are smoke experiments. Use "18 NASA spaceflight combustion datasets" |
| Landing strip | "2,818 NASA data rows" | yes, `tables_index.json` |
| Landing strip / trust | "0 mismatches in 1,533 checked values" | yes, `flex_crosscheck.json` |
| Trust table | "Held-out droplet burning rate MAPE 13.3 % (n = 66)" | yes, `validation/droplet_K.json` |
| Trust table | "SIBAL flame-spread error 29.3 % (n = 1)" | yes, `params/spread.json` |
| Trust table | "Published validation targets 5 of 16 pass" | **Misleading.** 5 pass, 6 fail, 5 pending data (`validation/summary.json`) |
| Story 01 | "80,000 miles from home, Orion's fire alarm went off" (Artemis II) | cited to Aerospace America; wording **unverified** (HUMAN_TASKS #17) |
| Story 04 / findings | "No solid material in NASA's ISS combustion data has been burned at her oxygen level" / "22.2 %" | yes, `materials.json` (PSI solids). ACME BRE (gas burner) reached 40 % and is disclosed |
| Landing / verdict | "Lunar Habitat burns out 5.7× slower" | numbers yes (30 s / 171 s); **wording wrong** (different end mechanisms) |
| Bento | "CALIBRATED" on the O₂ fix | spread calibrated on n = 1; should say so |
| Bento | "Numbers not in the engine output are removed" | yes, guard |
| How it works | "calibrated on PSI flight tests, run 200× for uncertainty bands" | spread n = 1 calibration; MC n is `MC_N`. ok, n should be stated |
| Landing | "every claim cites a NASA experiment" | **No.** Aster catalog answers cite records, not claims; design inputs are not NASA experiments. Soften to "every number is checked against the simulation; sources are shown" |
| README | "Live app: https://flame-in-freefal.vercel.app" | that URL works, but the team URL is `emberatlas-five.vercel.app`; keep both until the team confirms |
| README | "Type: Geist Sans…" | true for the code; conflicts with the design brief |
| About | Team bios | removed on `main` (members are minors; Team Max Q only) |
| Anywhere | parchment-burn model, "never done before", accuracy % beyond the above | **not found** (`grep -ri parchment|never done|first ever|accura`) |

## 10. Top problems (worst first)

1. **Aster answers run questions from keyword search, not from the run.** The brief's test question gets PSI-26 only and "0 numbers checked" (Validity, Relevance).
2. **Phone: the 3D canvas renders at 150 px tall, so the viewport is black.** The nav is also clipped (Presentation).
3. **The headline verdict is misworded and hides why each fire ended** ("burns out 5.7× slower"; quench vs burnout). The key parameter (5 cm/s quench) is TODO_VERIFY and invisible (Validity).
4. **The gravity effect beyond the quench switch is not modelled, and the docs don't say so.** 1/6 g = 1 g results surprise a judge (Validity).
5. **No credits page; REFERENCES.json and CREDITS.md are incomplete.** This is a Space Apps eligibility rule (Relevance/eligibility).
6. **Claim fixes:** "18 ISS fire experiments", "5 of 16 pass", "every claim cites a NASA experiment" (Validity).
7. **The Python hygiene test fails** (15 files without the SI header), so `make test` is red (Validity, repo).
8. **Input validation:** thickness 0 → NaN; negative flow accepted (Validity).
9. **No search on Methods or Evidence**, and the tested envelope per material is never shown visually (Presentation, Relevance).
10. **Apply & re-run has no before/after diff;** sensitivity levers can't be applied (Impact, Presentation).
11. Fonts differ from the stated design language; no robots/sitemap/metadataBase; no `TODO_VIDEO_URL` slot; README URL.

### Before scores (whole project, 1–5)

| Impact | Creativity | Validity | Relevance | Presentation |
|---|---|---|---|---|
| 3 | 4 | 3 | 4 | 3 |

---

# Phase 2: plan

## Major upgrades (chosen)

| # | Upgrade | Problem solved | Criteria | User-visible result | Files | Risk | Estimate |
|---|---|---|---|---|---|---|---|
| U1 | **Run-aware Aster with an offline explainer** | §4 #1 | V, R, P | Aster on the simulator automatically gets the current run (A and B: outcome, end reasons, events, inputs, evidence). Questions are classified by intent (why longer/shorter, why out, extinguisher, gravity, O₂, closest test, what to change). The deterministic offline answer quotes engine numbers and cites PSI-98/99/100, PSI-25 and FM2. Catalog retrieval uses field-weighted BM25 with synonyms. Citations link to `/evidence#psi-xx`. Suggested follow-ups. The guard checks numbers against the run | `lib/ai/runFacts.ts` (new), `lib/ai/explain.ts` (new), `lib/ai/localAster.ts`, `app/api/aster/route.ts`, `components/Aster.tsx`, `components/ai/kit.tsx`, tests | med | 2.5 h |
| U2 | **Search on Methods and Evidence** | §5 | P, R | An inline search box (`/` to focus, ↑↓ Enter) over equations, assumptions, limitations, PSI datasets (accession, title, experiment, materials) and sources. Highlighted matches, deep links (`#id`), and a `?q=` URL. Not a ⌘K palette | `lib/search/index.ts` (new), `components/search/SiteSearch.tsx` (new), methods + evidence pages, tests | low | 1.5 h |
| U3 | **"What changed" diff for Apply & re-run** | §3 | I, P | After Apply & re-run (and a what-if "Open as B"), a card lists the inputs that changed and the before → after values for time to extinguish, peak heat, peak CO₂ and min ppO₂, with direction, end reason and badges. Sensitivity levers get Apply buttons too | `lib/sim/diff.ts` (new), `components/sim/RunDiff.tsx` (new), `DesignReview.tsx`, Workspace result strip, tests | low | 1.5 h |
| U4 | **Material envelope explorer** | §2 | R, V, P | On Evidence: one Plotly chart of every PSI-tested material's O₂ × pressure test box (and flow range) with the ISS, lunar habitat and current-run conditions as points. "Outside NASA's data" is visible at a glance. Opened from the simulator's Next test with the run's point (`/evidence?o2=…&p=…#envelope`) | `lib/evidence/envelope.ts` (new), `components/evidence/EnvelopeExplorer.tsx` (new), EvidencePage, tests | low | 1.5 h |
| U5 | **Next-test brief + shareable run** | §3, §2 | I, R, P | "Next test" exports a one-page Markdown brief: material, O₂, pressure, gravity, flow, why (distance from envelope), the PSI campaigns and hardware that tested the material (from `investigations.json`), what the engine predicts and its caveats. Plus "Copy link" with the full scenario encoded in the URL (`?s=`), which reopens and reruns the exact scenario, and a Markdown run report (results, assumptions, sources) | `lib/sim/brief.ts`, `lib/sim/share.ts` (new), Workspace More menu + NextTest card, tests | low | 1.5 h |
| U6 | **Credits page + honest science disclosures** | §6, §1 | R, V, P | `/credits` lists every NASA resource (name + URL), every paper, data source, library (with licence + URL), font, AI tool and component source, generated from `docs/REFERENCES.json` and `software.yaml`. The verdict strip says *why* each fire ended and shows the quench-limit TODO_VERIFY. Methods states the gravity and low-pressure limits | `app/credits/page.tsx`, `physics/data/software.yaml`, `export.py` run, verdict, Methods | low | 1 h |

**Not doing, and why**
- *Judge-mode guided tour (candidate 8):* CLAUDE.md says "No guided tours". A clearer landing CTA and the one-click demo run already cover it.
- *Better simulation visuals (candidate 1):* the 3D flame is already engine-driven (front, burning length, Heskestad length, sheath, tilt, smoke and agent burst, `scene3d/frame.ts`). The best value here is the phone canvas fix plus the verdict wording. A new extinguisher particle system would be visual polish with no new science, at high risk to frame budget.
- *Retraining or new physics (a real flow-dependent spread term):* there is no PSI data in the repo to calibrate `mu` with held-out tests. Adding an uncalibrated term would only change numbers, not trust. We disclose it instead.

## Must-fix items (do first)

1. Add the SI-assisted header to the 15 files (`make test` green).
2. Phone 3D canvas height; phone nav (hide the language select below `sm`, keep the theme toggle); Ask Aster vs footer overlap.
3. Verdict wording: "Fire lasts 5.7× longer" plus the end reason per side (quenched / burned out / inerted / still burning) and the quench-limit source with its TODO_VERIFY status.
4. Claims: "18 NASA spaceflight combustion datasets"; "5 of 11 checked targets pass (6 fail; 5 await data)"; soften "every claim cites a NASA experiment"; "CALIBRATED (n = 1)".
5. Scenario validation: thickness > 0, length/width > 0, flow ≥ 0, x_O₂ ∈ [0, 1], P > 0, g ∈ [0, 1].
6. Methods limitations: gravity enters only through the low-flow quench (thin-fuel spread is flow-independent; no finite-rate term); no low-pressure / ppO₂ flammability limit; quench limit is TODO_VERIFY.
7. `robots.ts`, `sitemap.ts`, `metadataBase`; `TODO_VIDEO_URL` placeholder in README and About; README live URL(s).
8. Fonts: Space Grotesk (display) / Inter (UI) / JetBrains Mono (numbers), self-hosted via `@fontsource` (OFL), replacing Geist.
9. `software.yaml` + `REFERENCES.json` + `CREDITS.md` complete with URLs and licences.

---

# Phase 3: what was built (2026-11-16)

Commits on `main`, one per step, each with tests: must-fixes, U1–U6, docs.

| # | Shipped | Evidence |
|---|---|---|
| Must-fix | Phone 3D canvas fills the viewport (was 358×150 → 358×506); phone nav fits; verdict "Fire lasts 5.7× longer in Lunar Habitat · ISS out at 30 s (quenched) · Lunar Habitat 171 s (burned out)", with the reason each fire ended and the quench limit's source and TODO_VERIFY status in the hover/screen-reader text; "about as long" below a 5 % difference; claims fixed (datasets wording, 5 pass / 6 fail / 5 pending, n = 1 chip, softened "every claim"); `InvalidScenario` input guard; Methods limits on gravity and pressure; Space Grotesk / Inter / JetBrains Mono; metadataBase, robots, sitemap; SI headers; Evidence row count 2,844 → 2,818 (shared table was counted 3×) | `tests/audit-fixes.test.ts`, `e2e/ui-v2.spec.ts`, `e2e/final.spec.ts` |
| U1 | Run-aware Aster. "Why does the Moon fire last longer?" → engine answer, **17 numbers checked**, cites PSI-98/99/100, PSI-25, PSI-26 and NTRS 20240015307 (was: PSI-26 only, 0 numbers). Offline-first; with a key the model rewrites the draft and must pass the guard against it. BM25 catalog search ("What did Saffire find?" now returns PSI-98/99/100; before: nothing). Analyst offline answers are question-aware | `tests/aster-run.test.ts`, `e2e/upgrades.spec.ts` U1 |
| U2 | Search on Methods, Evidence, Credits: indexes the rendered page, `/` to focus, highlighted matches, `?q=`, deep links open collapsed equation cards | `tests/search.test.ts`, U2 e2e |
| U3 | "What changed" diff (inputs + outcomes, colour-blind-safe verdicts) after Apply & re-run, what-ifs and A/B compare; lever fixes now appliable (each re-run reproduces the printed "after" value) | `tests/diff.test.ts`, U3 e2e |
| U4 | Material envelope explorer on `/evidence#envelope` (O₂ × pressure or flow, missions, your cabin from the simulator, coverage table with the gap in words) | `tests/envelope.test.ts`, U4 e2e |
| U5 | Share link `?s=` (schema-validated, re-runs the exact scenario), Markdown run report, one-page next-test brief | `tests/share-report.test.ts`, U5 e2e |
| U6 | `/credits` with every resource and URL; Codex credited; 15 missing licences added; REFERENCES.json regenerated with library URLs | `tests/credits.test.ts`, `make test`, U6 e2e |

**Merged with the parallel "final polish" session on `main`** (commits `ce17b02`…`70346e3`): kept its decisions (no member names anywhere, the members are minors; "Team Max Q"; "SI" instead of "AI" in user-visible text; emberatlas-five as the live URL; Demo Numbers removed) and combined overlapping work: Aster uses its `runContext()` text plus this audit's run facts and explainer; catalog search = BM25 + its topic boosts and external FM2/LUCI records; `/credits` = this page plus its "used for" column; README = its structure plus the upgrades, limits and full resource list.

**Final checks on the merged tree (sandbox):** `pnpm lint` ✓ (alias of tsc) · `pnpm typecheck` ✓ · `pnpm test` 145 passed, 3 skipped · `pnpm build` ✓ (`/simulator` First Load 626 kB) · `make test` 21 passed · Playwright 37 tests: 36 passed in the full run, and the one failure (the parallel session's smoke test expected "Geist Sans" and the old heading) was updated and passes.

**Not done / left for the team:** see `docs/HUMAN_TASKS.md` #18–#27 (parchment data if it is ever claimed, video URL, the two Vercel projects, challenge link, quench-limit verification, 12 references without URLs, brand-asset origin, a material-list duplicate, `make export` data drift). A real ESLint setup and lazy-loading the heavy simulator bundle were not attempted (time-box).

## Expected score change (honest reasoning)

| Criterion | Before | After | Why it moves (or not) |
|---|---|---|---|
| Impact | 3 | 3–4 | The next-test brief and envelope explorer turn the gap in NASA data into something a mission team can act on. Still a hackathon tool (not for certification), so "4" depends on the video telling that story. |
| Creativity | 4 | 4 | Same concept; run-aware Aster and the envelope explorer are good executions, not a new idea. |
| Validity | 3 | 4 | The biggest gain: the AI now answers from the run with checked numbers and correct citations; the verdict says why each fire ended; the gravity/quench and low-pressure limits are stated; claims match the data; invalid inputs are rejected. It stays below 5 because spread is calibrated on n = 1 and the headline rests on a TODO_VERIFY quench limit. |
| Relevance | 4 | 5 | Every PSI-tested solid's envelope is now visible next to mission atmospheres, FM2 partial-gravity evidence is quoted where it matters, and every NASA resource is listed with its URL. |
| Presentation | 3 | 4 | Phone view works, search, credits page, clearer verdict, shareable links. A 5 needs the demo video, which only the team can record (HUMAN_TASKS #7). |

**Follow-up (2026-11-16):** all 12 references now have verified public URLs (`physics/data/sources.yaml`); the logo and Aster mascot are credited as the team's own work; the OpenAI key is set on emberatlas-five, the only Vercel project the team keeps. Deleting the second project (`flame-in-freefal`) was blocked by the build session's permissions and is HUMAN_TASKS #20.
