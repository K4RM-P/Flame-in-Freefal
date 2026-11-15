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
- No `VERCEL_TOKEN` in the session: no Vercel projects listed/removed, no deploy; dashboard steps are in HUMAN_TASKS #13.
