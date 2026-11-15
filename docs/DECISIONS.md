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
