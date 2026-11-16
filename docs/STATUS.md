# Status (after the judge-audit upgrade, 2026-11-14)

**Done:** routes `/`, `/simulator`, `/evidence`, `/methods`, `/about` (`/match` → `/evidence`, `/dashboard` → `/simulator`). Three presets (Saffire replay; Same fabric: ISS vs Lunar Habitat; Lunar Habitat: tune the response), one-click run via `?preset=iss-vs-lunar&run=1`. Evidence ranking gated by material class; envelope tolerance and distance-ranked next test; Compare delta card with EXTRAPOLATED badge. Landing page tells the Maya story with live counts. PSI ingest (2,818 rows), FLEX cross-check, held-out FLEX validation, SIBAL spread calibration, CSV export, OpenAI scenario builder / interpretation / match explanation with numeric guard.

**Theory-only:** cabin heat loss, smoke ageing and transport, suppression outside the fitted fuels; partial gravity is estimated between µg and 1 g and may be non-conservative (FM2, NTRS 20240015307).

**Unsourced:** Lunar Habitat volume (held equal to the ISS for a like-for-like comparison), Cygnus free volume (required input in the Saffire replay unless sourced), detector thresholds (alarm shows No data), current NASA-STD-3001 CO₂ limits.

**Skipped:** V6–V10 validation targets (PSI tables do not carry the needed quantities), heat-loss and smoke fits, partial-gravity flight data (none exists).

## UI v2: Vercel/Geist instrument design (2026-11-15)
**Done:** dark-first Geist tokens and shadcn structure (`components.json`, `lib/utils.ts`, `components/ui/*`: Button with mono size, dropdown, popover, collapsible, tooltip, sonner, BackgroundPaths). Landing rebuilt as a scroll story (streamline hero with letter reveal, pinned four-beat story with O₂-gap chart, Find/Explain/Prevent bento with live previews, horizontal how-it-works, live demo chips, count-up findings, PSI marquee, trust table, final CTA). Every landing number comes from `lib/landing/facts.ts` (data files + a build-time `iss-vs-lunar` engine run with the simulator's seed and MC size), enforced by `tests/landing.test.ts`. Top bar with ember `layoutId` underline, theme toggle and GitHub link. Simulator: ≤ 5 top-bar controls + More menu, rail → 5 popover rows + Advanced, 4 HUD chips + details popover, one-line result strip, AI drawer with suggested questions, citation chips and guard indicator, toasts for export/copy/errors. Evidence: scroll-spy TOC, copy-link anchors, filter chips, expandable PSI provenance rows, PSI datasets table (`#psi-xx` anchors). Methods restyled only.
**Verification:** `pnpm typecheck`, `pnpm lint`, `pnpm test` (62 passed, 3 skipped), `pnpm build`, and all 19 Playwright tests (incl. `e2e/ui-v2.spec.ts`: no console/hydration errors, sticky panel pinned, reduced motion, 11 visible simulator controls at 1440×900, non-black canvas, axe contrast on `/`, `/simulator`, `/evidence`) pass locally.
**Not done:** Lighthouse was not run (no Lighthouse in the sandbox); NASA candle photo and demo video are placeholders pending HUMAN_TASKS #15–16; the Overview language switcher was removed with the old landing.

## 3D viewport (2026-11-15)
**Done:** fixed the cropped/black 3D view (R3F canvas sized by CSS, no remounts, SSR guard, WebGL + error-boundary fallback to the SVG elevation, loader, never-black empty state). 3D is the default view (3D · Elevation · Section) and takes ≈84 % of the workspace at 1440×900. The project tree collapses to a 44 px rail, side panels overlay below 1440 px, the chart dock collapses to a 36 px strip with a live sparkline (C, drag to resize, remembered), the legend is a `?` popover, and fullscreen is on F. Procedural lab module: 4 walls × 8 bays (16 racks + closeouts), ring frames with ≈800 fasteners, ≥40 cable strands in looms with zip ties, 6 corrugated hoses, 2 ducts, ≥24 handrails, bungees and stowage bags, velcro, 2 laptops (one shows a live engine readout), clipboard, PFE and PBA, hatch with hand-wheel and window, and a crew figure. Engine-driven flame, char, smoulder, fire light, smoke, detector/beacon, fan, vents, agent burst, HUD glass chips, limit chips, theory-only ring and honesty caption. Camera presets 1–4, double-click focus, item tooltip, `?present=1` with a 16:9 letterbox toggle, `?lowfx=1`, PerformanceMonitor degrade ladder (AO → bloom → shadows → DPR 1). Compare uses two drei Views in one Canvas. Methods has a "3D visualization" subsection with the mapping table.
**Budget (measured in headless SwiftShader):** 95 scene draw calls, ≈218k triangles (budget ≤150 / ≤600k). 60 fps on an M1 Air could not be measured here (no GPU in the sandbox).
**Verification:** `pnpm test` (incl. `tests/scene3d.test.ts`), `tsc --noEmit`, `pnpm build`, and `e2e/scene3d.spec.ts` (DPR 1 and 2) pass. 2 pre-existing e2e failures on upstream `main` (strict-mode locator on `#earth-vs-orbit` in the evidence page) are unrelated.

**Update:** one Play action (toolbar ▶ and viewport ▶ behave the same: run if needed, then play like a video with speed 0.5–4× and a scrubber with event markers); flame shape now follows Heskestad length, α/u sheath, wind tilt and puffing frequency from engine values (visual only, `web/data/params/flame_visual.json`); toolbar trimmed to project · scenario · Play · view · Compare · Results · Export.

### 3D: not done
- `docs/REFERENCES.json` was not regenerated: `physics/validate/export.py` fails in this sandbox (no project venv; pandas `DataFrame.accession` error). Run `make export` locally to pick up the 4 new libraries already listed in `software.yaml`.
- Post-processing is off in the Compare split view (EffectComposer is not per-View).

## Decisions made during the upgrade
- Landing trust strip computes PSI rows from `tables_index.json`, FLEX mismatches/values from `flex_crosscheck.json`, and the held-out FLEX MAPE and n from `web/data/validation/droplet_K.json` (`summary.json` has no `metrics` block; the metrics live in `droplet_K.json`).
- Landing is a server component (no hooks); the old Aster button, tiles, conceptual SVG, mitigation review and repeated caveat lists were removed.
- Methods: the Saffire replay is framed as a "Cabin-scale sanity check" next to the held-out SIBAL spread error (read from `spread.json`, n from its test split).
- About: team section shows only the team name and its areas of experience (members are minors; no names).
- `docs/REFERENCES.json` regenerated from `physics/data/software.yaml` (OpenAI API at runtime; the stale Claude API / "Ask agent" / "demo answers" entries are gone).
- ISS volume: 388 m³ cited to NASA's Space Station Facts and Figures page (URL + locator in `physics/data/missions.yaml` and `web/data/missions.json`); status `cited`.
- Lunar volumes: the ISS vs Lunar preset holds B's volume equal to A's; the Lunar tune preset uses the ISS volume. Both carry `{source_id: "design input", note: "held equal to Scenario A …"}` provenance.
- Cygnus volume: no stated Saffire-III free volume in `saffire_ntrs.yaml` or `sources.yaml` (the Saffire-IV 17.9 m³ is a different flight), so the replay keeps it as its single required field with the hint "Enter the Cygnus free volume (not stated in PSI-100)".
- Envelope tolerance: degenerate tested ranges (min == max) widen by ±5 % pressure, ±0.01 x_O₂, ±20 % flow; non-degenerate ranges get 1 % slack so a value equal to a table entry to rounding is not flagged (the lunar 5.0 cm/s vs SIBAL's 5.03 cm/s minimum).
- Next test ranks out-of-envelope inputs by normalised distance (scales 0.05 x_O₂, 20 kPa, 10 cm/s, 0.5 g) and returns null inside the envelope; the old "changes the predicted outcome by N %" wording is gone.
- Evidence ranking: tiers burned-this-material → same solid class → ACME BRE (PSI-20, only when x_O₂ ≥ 0.26) → smoke (SAME, SAME-R, DAFT PSI-47) → liquid droplets (suppression role only), with condition distance as the tiebreaker.
- Removed the free-form "Ask" chat (`app/api/ask`, `lib/ai/ask.ts`, Assistant tab) so the simulator keeps one AI surface (scenario builder + interpretation); the Evidence page keeps the match explanation.
- README states the Earth-vs-orbit counts and max solid O₂ (22.2%) as of today with the source file; the UI computes them live.
- Deleted `docs/CLAUDE_SIMULATION_HUB_PROMPTS.md`. `docs/HUMAN_TASKS.md` trimmed to still-open human verification tasks.
- Demo Numbers restored at the team's request (later removed in the 2026-11-16 pass): manual setup has a "Demo Numbers" button that fills a labelled test case (lunar atmosphere, SAFFIRE SIBAL sample size, illustrative volume, flow, detector distance and threshold). The UI states the values are not NASA measurements; no preset or landing CTA uses them.
- Final audit (2026-11-14): removed the unreachable Review-flow modules (`lib/review`, `lib/ranking`, `lib/diff`, `lib/ui/console` and others) and the unused Aster, landing and schematic CSS. Fixed the Methods page overflow and the hidden Evidence/Methods links at phone width, and moved the chart legend off the axis title. The next test now names one ISS-flyable condition (e.g. "Fly SIBAL Fabric at 34% O₂ and 56.5 kPa; 1/6 g needs a partial-gravity platform") plus the spec's "x_O₂ 34% is 12 points above…" reason. The one-click run opens at peak heat release and scrolls to the result on mobile. Evidence sections have anchors; the raw PSI-99 "037 mm" thickness cells are flagged, not corrected. Accent was removed from the About cards and Methods step numbers.
- Not run: `make test` (no Python venv with pytest in this sandbox).

## AI fire engineer
Done: no-fire fix + card; interview (AI-chosen or fixed follow-ups ≤ 4, live provenance schematic, assumption confirm, camera to ignition); SSE streaming for /api/interpret and /api/aster with real-step thinking trail; Apple-Intelligence-style glow/orb kit (components/ai/kit.tsx); analyst drawer (briefing with number/citation chips, ranked fixes with Apply & re-run, what-if engine runs, suggested questions, next-test card, orb tab); Aster unified (same kit, Build this scenario, preset links); unit tests + offline Playwright (e2e/ai.spec.ts); screenshots docs/screenshots/ai-*.png.
Known gaps: sensitivity-lever fixes have no Apply button (no stored scenario); streamed answers are guarded after streaming (stripped text replaces the stream), not regenerated.

## 2026-11-15 — judge-polish pass (10-min time-box)
Done:
- P0 AI offline: Aster context questions (JSON and stream) now answer locally from the engine's own facts under "AI offline: explanations are generated locally from the engine." — no 502/503 error states. NO_KEY_MESSAGE reworded to the same note. New test `web/tests/ai-offline.test.ts` runs Aster (context JSON, context stream, catalog) and the Build-with-AI interview with no key.
- P1 timeline: scrubber/playback horizon trimmed to last fire-out / agent-release event + 15 % (`web/lib/sim/horizon.ts`); engine untouched.
- P1 one-click demo: landing CTA already opens `/simulator?preset=iss-vs-lunar&run=1` (verified in code, not re-run in a browser).
- P2 metadata: root title/template and descriptions name EmberAtlas and the Flame in Freefall challenge; OG image already uses the brand hero.
- P2 About: team line + challenge name; existing Use of AI section kept.
Left undone (time-box):
- P1 lazy-load Plotly / 3D scene with next/dynamic + skeleton (First Load JS still ~608 kB).
- P1 placeholder sweep for the NASA candle photo / demo video slots (no "TODO/placeholder/lorem" strings found in app/components; media slots not audited visually).
- P2 390 px mobile audit, axe run on all five pages, language-switcher fallback audit.

## 2026-11-16 — final polish for submission
Done:
- Checks: `pnpm typecheck`, `pnpm test`, `pnpm build` passed at start; `make test` failed (15 source files missing the `SI-assisted` header) → fixed, 21 passed.
- Truth pass: accuracy numbers (1,533 values / 0 mismatches; MAPE 13.3 %, n = 66; spread 29.3 %, n = 1; 2,818 rows / 18 accessions) match `web/data`; no "99.86 %" anywhere (parchment data not in repo → HUMAN_TASKS #18). Hero "18 ISS fire experiments" relabelled "18 NASA PSI combustion investigations" (several are cool-flame/gas-flame studies and SAFFIRE flew on Cygnus, not the ISS). DEMO_SCRIPT engine output re-run: identical (ISS out 30 s; Moon burnout 171 s; 4 900 W vs 2 580 W; fixes alarm path → test at 34 % O₂ → O₂ 29.2 %).
- Demo Numbers button removed (illustrative values with no NASA source); `e2e/demo.spec.ts` deleted, `tests/ui.test.ts` now asserts no demo fill exists.
- Result strip: Extrapolated + "Partial g: may be non-conservative" (FM2) + "Smoke uncalibrated" + "Not for flight certification".
- Aster: on `/simulator` questions use the latest run (`lib/ai/runContext.ts`, engine numbers only); catalog retrieval adds topic boosts (Moon/partial g → BASS-II, SAFFIRE + FM2/LUCI outside PSI; spread; droplets; smoke); guard step reports "N numbers checked against the engine"; offline answer = engine facts + matched NASA records. Test: `tests/aster-run.test.ts`.
- Presets renamed: "ISS vs Moon base", "Moon base: find the gaps", "Saffire-III replay", "Moon base: tune the response".
- Landing hero: audience line, "Try the simulator" CTA, 4-step strip (Describe → Burn → Ask Aster → Fix). Footer/About/Credits: team, Toronto, challenge link.
- New: `/credits` (generated from `docs/REFERENCES.json` copy in `web/data/references.json`), `/evidence` dataset table gets title, DOI and "used for" (`lib/data/psiUses.ts`), 404 page, route error boundary, generated OG/Twitter image, site title "EmberAtlas — The firefighter for space", simulator first-run 3-step hint (localStorage in try/catch), phone "best on desktop" notice with "open anyway".
- `software.yaml`: fonts corrected to Geist, 12 missing libraries + licences added, adapted components (BackgroundPaths from 21st.dev, shadcn/ui) listed; OpenAI default model corrected to the code's `gpt-4o-mini`. `export.py` skips the telemetry CSV (crashed on missing `accession`).
- Repo: README rewritten for judges; `CONTRIBUTING.md`, root `.env.example`; deleted `docs/UPGRADE.md`, `docs/HANDOFF_UI.md` (old prompt/handoff files), unused `components/ui/background-paths-demo.tsx`; `.gitignore` + `*.mov`.
Not done / known:
- `make export` also rewrites `web/data/{missions,sources,psi_catalog}.json` and `web/public/psi/*` with older content than the hand-curated web copies (e.g. the FM2 note, ISS volume citation): those were reverted; only REFERENCES was regenerated. The yaml sources need the same edits before the next full export.
- Lighthouse not run (no Lighthouse in the sandbox).
