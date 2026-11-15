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
- Vercel: exactly one project (`flame-in-freefal`, team karm-patels-projects, Git-linked to K4RM-P/flame-in-freefal, Production Branch `main`), no duplicates to remove. It had Root Directory `physics` + Framework Python (production ERROR); fixed via API to Root `web`, Next.js, Node 22.x, `pnpm install`/`pnpm build`. Production: https://flame-in-freefal.vercel.app.
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
