# Decisions

## 3D viewport (2026-11-15)
- **Stack:** `@react-three/fiber` 9, `drei` 10, `@react-three/postprocessing` 3 + `postprocessing`, `three` 0.187 kept. Licenses added to `physics/data/software.yaml`.
- **Route:** the brief says the `/` workspace; the simulator lives at `/simulator` (`/` is the landing page), so the work targets `/simulator`.
- **Engine bridge:** `web/components/sim/scene3d/frame.ts` is the only place engine output becomes visuals (`VisualState`, unit-tested in `web/tests/scene3d.test.ts`). Playback interpolates linearly between engine frames; discrete states (status, events) use the lower frame.
- **Canvas split:** `Scene3D.tsx` is the shell (WebGL detect, error boundary → SVG Elevation, HUD, loader); the `<Canvas>` lives in `Canvas3D.tsx`, loaded with `dynamic(..., { ssr: false })`. Context/layout helpers are in `vis.tsx`; shared materials and the merge-per-material geometry bag in `materials.ts`.
- **Layout scale:** sample holder leading edge at x = 0.3 m, mid-aisle near the port wall; items laid end to end along +x (same 15 % schematic gap as the SVG); the detector sits on the overhead at x = sample − d (to scale). If d runs past the far bulkhead the detector is drawn at the bulkhead and a HUD chip says so.
- **Flow direction:** ventilation flows toward −x (supply vent upstream, return vent downstream), spread toward +x, matching the SVG's opposed-flow convention.
- **Lights:** 6 emissive LED panels; 2 of them are spot lights with PCF shadows (three r187 removed PCFSoftShadowMap, so `shadows="percentage"` is used), 4 are point lights. No `RectAreaLight` (cost); a `<Lightformer>`-built environment gives reflections without any HDRI download, so `images: []` in REFERENCES stays true.
- **Flame:** raymarched box volume (32 steps, 3-octave simplex FBM, early-out outside the envelope). µg ↔ 1 g blended by g^(1/3); 1 g flicker ≈ 11 Hz; a soft HDR shoulder keeps the core > 1 for bloom without clipping. Size and colour come only from `VisualState`.
- **Agent:** the engine's agents are CO₂ and N₂ (no water mist), so the burst is a white (CO₂) or pale-blue (N₂) gas cloud, ≈2.5 s of sim time.
- **Smoke "no data":** no particles and a chip when the run warns "no sourced smoke yield", or when there is no smoke parameter and the detector trace is zero.
- **Compare:** two drei `<View>`s in one Canvas, each with its own camera rig bound to its own half; post-processing is skipped in split view (EffectComposer is not per-View).
- **Frame loop:** `always` while playing or presenting, else `demand` (invalidated on frame/layer/camera change). Reduced motion: demand only, time frozen, no camera auto-moves.
- **Camera:** drei `CameraControls` with `boundaryEnclosesCamera` on a box 0.15 m inside the rack faces; `smoothTime` 0.28 s ≈ 0.8 s tweens. The close-up preset aims at the live flame position (front − half burning length).
- **Present mode:** `?present=1` loads `lunar-tune` unless `?preset=` is given, auto-runs, plays the run in ≈22 s and dollies Overview → close-up.
- **Persistence:** dock open/height and tree state are kept in `localStorage` key `ea.ui3d` (every access in try/catch).
- **Keyboard:** R run, C dock, F fullscreen, 1–4 presets; shortcuts are ignored while typing in text fields (not on range sliders).
- **Headless e2e:** Playwright launches Chromium with SwiftShader flags so WebGL renders without a GPU.

## Playback, flame physics, simpler UI (2026-11-15)
- **One Play action:** the toolbar button and the viewport's round ▶ (and Space/R) call the same `playPause()`: it runs the simulation if there is no result or the inputs changed since the last run, then plays from the start; pauses while playing; restarts at the end. The separate Run, ▷ and ⟲ buttons are gone.
- **Video-like playback:** sim time advances with wall time (whole run ≈ 24 s at 1×; 0.5×/1×/2×/4×). The 3D view reads the fractional playhead each frame; the store frame updates at ≤ 20 Hz so the page stays smooth. The scrubber, time, speed and event markers (● ignition, ▲ alarm, ■ fan off, ▨ agent, ✕ extinguished) live in a video-style strip at the bottom of the viewport, with Camera, Layers, ?(legend + assumptions) and fullscreen.
- **Next-step bar:** only shown when an input is missing (or a run fails); otherwise the viewport says what to do.
- **Flame shape physics (visual only):** `flamePhys()` in `scene3d/frame.ts` uses engine Q (split by burning area), burning area, flow, spread rate (d front/dt) and g: Heskestad flame length scaled (g/g0)^(−1/5) for partial g; µg sheath ≈ k·α/u_rel (thickens and dims when the fan stops); wind tilt tan θ = u/√(gL) (fully along the flow in µg); puffing frequency 1.5/√D·√(g/g0). Constants and citations are in `web/data/params/flame_visual.json` (verified=false; spot-check in HUMAN_TASKS). None of this changes any engine number.

## Repo + Vercel cleanup (2026-11-15)
- Only `main` existed on origin (no unmerged branches, nothing to merge or delete); open PRs could not be listed (no `gh`), none closed.
- No dead routes/components found: every file under web/components and web/lib is referenced (`/api/match` and components/match are live, used by /evidence); no FireScene3D, app-old, v1, backup folders or committed node_modules/.next/out/*.log.
- `.gitignore` now also ignores `.next/`, `out/`, `*.log`, `.env*.local` at any depth.
- One Next app in `web/`; root package.json only proxies scripts. `vercel.json` (root and `web/`, since Vercel reads it from the Root Directory) = Next.js, `pnpm install`, `pnpm build`, auto-deploy `main`; Node 22.x via `web/package.json` engines.
- Added `typecheck` script to web (`tsc --noEmit`); typecheck, lint, 58 tests and `next build` pass locally.
- Vercel: exactly one project (`flame-in-freefal`, team karm-patels-projects, Git-linked to K4RM-P/flame-in-freefal, Production Branch `main`), no duplicates to remove. It had Root Directory `physics` + Framework Python (production ERROR); fixed via API to Root `web`, Next.js, Node 22.x, `pnpm install`/`pnpm build`. Production at the time: https://flame-in-freefal.vercel.app (the submitted site is now https://emberatlas-five.vercel.app).
- `OPENAI_API_KEY` is not set on Vercel (no env vars at all); not invented — HUMAN_TASKS #13.

## 2026-11-15 core fixes (firefighter story)
- Alarm source: option (b). No smoke/soot yield for SIBAL (cotton/fiberglass) is in `properties.yaml` or `sources.yaml`, and no detector threshold is sourced; not invented. Presets use `detection.manual_alarm_s = 30` ("crew detects the fire at t = 30 s", provenance `design input`).
- `iss-vs-lunar` A and B, and `lunar-tune`, share `CREW_RESPONSE` (crew alarm 30 s, fan off on alarm, 2 kg CO₂ 30 s after alarm), all `source_id: "design input"`.
- Demo chain result (not tuned): ISS = alarm 30 s → fan off 30 s → extinguished 30 s (quench: no flow in µg) → CO₂ 60 s, i.e. the fire is out BEFORE the agent. Moon = alarm → fan off → CO₂ 60 s → burnout 171 s: the agent fails. Tests assert this real order, not the hoped-for one.
- New preset `lunar-design-review` = `lunar-tune` with `manual_alarm_s: null`: extinguisher fitted, no alarm path, agent never released.
- Design review (`lib/sim/designReview.ts`): tiers = rule-based (design-input) → calibrated levers → theory-only levers; in-envelope first; then effect. Metrics: time_to_extinguish, peak_Q (from state), min_o2, peak_co; peak_co is theory-only (smoke/CO uncalibrated); one fix per lever.
- Sensitivity runs shared across metrics via `sensitivityMulti` + a memoized runner: 12 runs + ≤ 3 rule runs ≤ 15. Runs on the main thread (≈ 1 s); not moved to the worker (the worker only takes simulate()).
- Added an agent-mass lever (×0.5/×2) to the tornado; material lever now lists only alternative materials (the current one is the base).
- O₂ lever low end floored at the sourced crew minimum ppO₂ (16.5 kPa, `nasa-std-3001-v2`, TODO_VERIFY) so the review never proposes a hypoxic cabin (Moon: 29.2 % at 56.5 kPa instead of 16.4 %).
- AI facts: `design_review` is recomputed server-side from the posted scenario (engine numbers), so the guard's allowed-number pool contains the fix numbers; INSTRUCTIONS require fix #1 and the theory-only mention.
- AI unavailable: the interpretation error now appends a deterministic "Offline summary" (`lib/ai/localInterpret.ts`); the design review panel never needs the API.
- Partial gravity: one wording (`lib/sim/wording.ts`, FM2 NTRS 20240015307) in engine warnings, Methods text, UI caveat strings, glossary, nextTest, AI instructions, README, STATUS, CLAUDE.md; `SimResult.flags.partial_g_nonconservative`. FM2 finding added as a `note` in `sources.yaml`, mirrored by hand into `web/data/sources.json` and `docs/REFERENCES.json` (venv not available to regenerate).
- Python `CAVEAT_G` and TS `CAVEAT_G` updated identically (still contain "bounded estimates" for the pytest check).
- CO/smoke: `OutcomeMetric.theory_only` + "(theory-only)" in the peak CO label; series CSV headers for x_co and smoke_det (and T_K while heat loss is uncalibrated) carry "(theory-only)".
- Spread validation: no additional rows. PSI Saffire tables and `saffire_ntrs.yaml` hold only two µg opposed-flow SIBAL spread rates (I-2, III-2); Saffire-II's opposed row is silicone at 1 g (no properties); BASS/BASS-II tables have no spread rate. Stays n_test = 1, MAPE 29.3 %. (scipy not installed, so a 2-fold swap was not computed.)
- Unit spacing: "322  s" came from a full-width space in the mono number font; `withUnit()` in `lib/ui/format.ts` joins number and unit with U+202F; used in the Compare headline and the design review.
- Footer "SI internal" → "spread test error 29.3 % (n = 1)" (data-driven from `params/spread.json`).
- NASA images: download blocked (proxy 403 for nasa.gov and images-assets.nasa.gov). `lib/media.ts` holds local target paths + fallback URLs; HUMAN_TASKS #14.
- GitHub Pages: no `.github/workflows` exists in the repo (already removed); HUMAN_TASKS #12 removed. Vercel is the only deploy.
- About: removed IdeaOrbit, CrewCarousel, MissionLog (no other importers); team shown as names only (roles unconfirmed). Their `ea-crew*`/orbit CSS in globals.css is the UI session's to delete (docs/HANDOFF_UI.md).
- 3D crew figure: off by default in Layers (toggle kept).
- Demo Numbers: not in `lib/` (lives only in `components/sim/Onboarding.tsx`); left for the UI session (docs/HANDOFF_UI.md).
- 2026-11-15 · lucide-react 1.x ships no brand icons; the GitHub link uses Lucide `FolderGit2` (Lucide-only rule kept).
- 2026-11-15 · UI v2 palette: dark-first Geist/Vercel tokens (#0A0A0A/#111/#171717, #262626 hairlines); ember #FF6B2C replaces #FF6B35 per the v2 brief (supersedes the CLAUDE.md accent value).
- 2026-11-15 · `--faint` text is #8F8F8F (dark) / #6B6B6B (light), not #6B6B6B on dark: #6B6B6B on #0A0A0A is 3.6:1 and fails WCAG AA; #6B6B6B kept as `--faint-deco` for non-text.
- 2026-11-15 · Tailwind `accent` now = raised surface (shadcn semantics); the ember colour is Tailwind `ember` (+ `ember-text`). CSS var `--accent` still = ember so existing CSS keeps working.
- 2026-11-15 · shadcn structure: `components.json` (new-york, rsc), `lib/utils.ts` `cn()`, primitives in `components/ui/` (button, dropdown-menu, popover, collapsible, tooltip, sonner, kit); `components/ui-kit` merged into `components/ui/kit.tsx`.
- 2026-11-15 · Fonts via the local `geist` package (no `next/font/google`); Newsreader/Inter/JetBrains Mono and `.serif` removed.
- 2026-11-15 · Theme bootstrap is dark unless the user saved "light" (dark-first; system preference no longer auto-selects light).
- 2026-11-15 · Landing numbers come from `lib/landing/facts.ts`, which runs the real `iss-vs-lunar` engine at build time with the simulator's MC size (`components/sim/constants.ts`) and default seed, so landing and simulator agree (1.9×). `tests/landing.test.ts` bans literal stat values in `components/landing/*`.
- 2026-11-15 · The Overview language selector was dropped with the old landing (the new copy is English-only); its e2e test was removed.
- 2026-11-15 · Simulator: Run = (re)simulate then play; Play/Pause only toggles playback. HUD values are plain text (4 chips); the receipt buttons moved to the ⓘ details popover so the chrome stays ≤ 12 controls (measured: 11 at 1440×900).
- 2026-11-15 · Old right-panel tabs (Outputs, Evidence, AI) became the AI drawer tabs (AI · Results · Evidence); the NEXT STEP banner and the duplicate "Results & evidence" button were removed.
- 2026-11-15 · Story panels crossfade with CSS on stacked layers (not AnimatePresence), and the active beat is computed from the section rect, so jumping several beats at once never leaves a stale panel.
- 2026-11-15 · Live demo uses a static screenshot of our own simulator (`public/media/sim-3d.webp`) rather than a lazy live `<Scene3D>`; it costs about 190 KB versus a WebGL context on the landing. `demo.mp4` is used automatically once it is added.
- 2026-11-15 · Evidence: the Earth-vs-orbit `<section>` uses `aria-label` so only the table scroll region is named after the heading (Playwright strict mode).
- AI fire bug root causes: /api/scenario had no offline path (503), the model left item geometry/ignite null so drafts failed ScenarioSchema, and unknown words ("cotton", "paper") were rejected outright; fixed with lib/ai/localScenario.ts (synonym table filtered to materials.json keys + PSI-98 S1 sample geometry, all flagged).
- Nomex has PSI burn tests but no spread properties in properties.json, so it cannot ignite; reported as "Nothing to catch fire" with the reason, not remapped to PMMA.
- Paper/cellulose has no PSI data: rejected as "Material not in NASA's data", SIBAL suggested; no material invented.
- Cable/wire maps to Kapton (smoke data only), so "ignition near a cable bundle" honestly yields no flame plus an "Add SIBAL" fix.
- Cygnus/lunar volumes without a source are held equal to the ISS habitable volume, tagged "AI assumption" (amber).
- /api/scenario modes parse|followups|finalize; follow-ups use the fixed missing-field set (≤ 4) even with a key (AI-chosen questions cut for time).
- Cut for the 15-min box: streaming + thinking trail, analyst drawer Apply & re-run, Aster unification, Playwright specs, screenshots.
- Apply & re-run uses the exact edited scenario stored on each rule-based DesignFix (`scenario`), loaded as B and run with the A/B compare; sensitivity-lever fixes get no button until they carry one.
- Streaming: one SSE protocol (lib/ai/stream.ts: step/token/replace/done/error) for /api/interpret, /api/aster and client what-ifs; the trail renders only emitted steps.
- Streamed answers are guarded once complete; a failing answer is stripped and replaces the streamed text (no regeneration while streaming).
- Offline briefing is the deterministic engine summary sent as one token (no simulated typing).
- "Apple Intelligence" look = rotating conic glow, viewport edge glow, breathing orb with sparks, shimmer, all in ember/amber/oxygen-blue tokens; disabled under prefers-reduced-motion.
- AI entry points reduced to Build with AI (simulator + onboarding) and Aster; the analyst drawer opens from the right-edge orb tab after a run. Removed: Describe box, Onboarding draft form, DraftReview, "Ask Aster about this run".
- AI-chosen follow-ups are re-validated server-side (ids ⊂ missing fields, option values ⊂ fixed set, materials ⊂ materials.json), else fixed questions.
- guard.numbersIn joins thin/no-break-space digit groups (format.ts writes "4 920"), which previously split into 4 and 920.
- What-if answers quote peak_Q from the state trace, so the guard pool includes whatIfFacts() (engine metric values).
- Added --ai-pink / --ai-violet tokens (tokens.css) for the Apple-Intelligence-style iridescent gradient (AI surfaces only: glow, orb, launcher pill, screen-edge glow); /api/scenario spends a rate-limit token only on OpenAI calls, answers refine on the client (an interview used to hit the 8/min limit).
- AI UI v3: warm liquid glass (red/orange/yellow only: --ai-red, --ai-yellow replace pink/violet), star mark replaces the orb (no orb on Build with AI), turning-arc + drawn-check thinking trail, flow line, pill composer with round send; no gradient text.

## Final polish (2026-11-16)
- Demo Numbers removed: the submission rule "no fake or demo data" overrides the earlier team request.
- Aster uses the simulator's latest run as context automatically when no other context is selected; the run context is built client-side from the engine result with the UI formatter so the guard pool and the visible numbers agree.
- Partial-gravity evidence comes from FM2/LUCI (outside PSI) and is labelled so; there is no PSI partial-gravity fire data.
- `LIVE_URL` (metadataBase, README) is `emberatlas-five.vercel.app`: the submitted Vercel project, the only one with the OpenAI key (team confirmation, 2026-11-16). `flame-in-freefal.vercel.app` is a second project that also deploys `main`.
- Phones get a "best on desktop" notice on `/simulator` rather than a cramped workspace; the visitor can still open it.
