"use client";
// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// The R3F <Canvas> (loaded client-only by Scene3D). One view, or two side-by-side drei <View>s in one Canvas for
// Compare. Frame loop: "always" while playing/presenting, otherwise "demand" (invalidated on frame/camera change).
import { PerformanceMonitor, PerspectiveCamera, View } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import * as THREE from "three";
import type { Scenario, SimResult } from "@/lib/sim/types";
import { useReducedMotion } from "../CabinView";
import { PLAYBACK, useSim } from "../store";
import { CameraRig, type RigApi } from "./CameraRig";
import { Crew } from "./Crew";
import { Effects } from "./Effects";
import { FireItems } from "./FireItem";
import { visualState } from "./frame";
import { Greebles } from "./Greebles";
import { Lighting } from "./Lighting";
import { Module } from "./Module";
import { Smoke } from "./Smoke";
import { Systems } from "./Systems";
import { VisCtx, layoutOf, type Vis } from "./vis";

export interface ViewSpec { sc: Scenario; r: SimResult | null }

function World({ sc, r, present, shadows, domElement }: ViewSpec & { present: boolean; shadows: boolean; domElement?: HTMLElement | null }) {
  const reduced = useReducedMotion();
  const layers = useSim((s) => s.layers);
  const frame = useSim((s) => s.frame);
  const vs = useRef(visualState(sc, r, frame));
  const layout = useMemo(() => layoutOf(sc), [sc]);
  const vis: Vis = useMemo(() => ({ vs, reduced, layers, sc, r, layout }), [reduced, layers, sc, r, layout]);
  const last = useRef({ f: frame, t: 0 });
  const api = useRef<RigApi>(null);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => { vs.current = visualState(sc, r, frame); invalidate(); }, [sc, r, frame, layers, invalidate]);
  useFrame(() => {
    const st = useSim.getState(), now = performance.now();
    if (last.current.f !== st.frame) last.current = { f: st.frame, t: now };
    const fi = st.playing && !reduced ? st.frame + Math.min(1, (now - last.current.t) / PLAYBACK.stepMs) : st.frame;
    vs.current = visualState(sc, r, fi);
  }, -1);
  return (
    <VisCtx.Provider value={vis}>
      <color attach="background" args={["#15181d"]} />
      <Lighting shadows={shadows} />
      <group onDoubleClick={(e) => { e.stopPropagation(); api.current?.focus(e.point.clone()); }}>
        <Module />
        {layers.module && <Greebles seed={sc.name} />}
        <FireItems />
      </group>
      <Smoke />
      <Systems />
      {layers.crew && <Crew />}
      <CameraRig present={present} apiRef={api} domElement={domElement} />
    </VisCtx.Provider>
  );
}

/** Dev-only renderer.info logging + a window hook the e2e/perf check reads. */
function Info() {
  const gl = useThree((s) => s.gl), scene = useThree((s) => s.scene);
  const n = useRef(0);
  useEffect(() => { gl.info.autoReset = false; return () => { gl.info.autoReset = true; }; }, [gl]);
  useFrame(() => {
    const { calls, triangles } = gl.info.render;
    gl.info.reset();
    if (n.current++ % 90 !== 0) return;
    // Budget check (§5): scene draw calls = visible meshes/points/lines (an InstancedMesh is one call); triangles incl. instances.
    let sceneCalls = 0, sceneTris = 0;
    scene.traverseVisible((o) => {
      const m = o as THREE.Mesh;
      if (!(m.isMesh || (o as THREE.Points).isPoints || (o as THREE.Line).isLine)) return;
      sceneCalls++;
      if (m.isMesh && m.geometry) { const g = m.geometry, n = g.index ? g.index.count : g.attributes.position.count; sceneTris += (n / 3) * ((o as THREE.InstancedMesh).isInstancedMesh ? (o as THREE.InstancedMesh).count : 1); }
    });
    const w = window as unknown as { __ea3d?: unknown };
    w.__ea3d = { calls, triangles, sceneCalls, sceneTris: Math.round(sceneTris) };
    if (process.env.NODE_ENV !== "production") console.debug(`[3d] renderer.info calls ${calls} · triangles ${triangles} · scene draw calls ${sceneCalls} · scene triangles ${Math.round(sceneTris)}`);
  });
  return null;
}

function GlSetup() {
  const gl = useThree((s) => s.gl);
  useEffect(() => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.05; gl.outputColorSpace = THREE.SRGBColorSpace; }, [gl]);
  return null;
}

export default function Canvas3D({ views, present = false, lowfx = false, onReady }: { views: ViewSpec[]; present?: boolean; lowfx?: boolean; onReady?: () => void }) {
  const [level, setLevel] = useState(lowfx ? 4 : 0);
  const playing = useSim((s) => s.playing);
  const reduced = useReducedMotion();
  const frameloop: "always" | "demand" = !reduced && (playing || present) ? "always" : "demand";
  const shadows = level < 3;
  const common = {
    frameloop, dpr: (level >= 4 ? 1 : [1, 1.5]) as number | [number, number], shadows: shadows ? ("percentage" as const) : false,
    gl: { antialias: false, powerPreference: "high-performance" as const, preserveDrawingBuffer: true },
    onCreated: () => onReady?.(),
    style: { width: "100%", height: "100%", display: "block" },
  };
  const perf = <PerformanceMonitor flipflops={2} onDecline={() => setLevel((l) => Math.min(4, l + 1))} />;
  const container = useRef<HTMLDivElement>(null);
  const refs = [useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null)];
  const [els, setEls] = useState<(HTMLDivElement | null)[]>([]);
  useEffect(() => { setEls(refs.map((r) => r.current)); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [views.length]);

  if (views.length === 1) {
    const v = views[0];
    return (
      <Canvas {...common} camera={{ fov: 50, near: 0.03, far: 30, position: [3, 0.4, 0.8] }}>
        <GlSetup />{perf}
        <World sc={v.sc} r={v.r} present={present} shadows={shadows} />
        <Effects level={level} />
        <Info />
      </Canvas>
    );
  }
  // Compare: one Canvas, two Views (post-processing is skipped in split view; tone mapping and bloom-free HDR stay).
  return (
    <div ref={container} className="relative h-full w-full">
      <div className="grid h-full grid-cols-2 divide-x divide-line">
        {views.map((_, i) => <div key={i} ref={refs[i]} className="relative h-full min-w-0" data-testid={`view3d-${i}`} />)}
      </div>
      <Canvas {...common} eventSource={container as React.RefObject<HTMLElement>} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block", pointerEvents: "none" }}>
        <GlSetup />{perf}
        {views.map((v, i) => <TrackedView key={i} track={refs[i]}>
          <PerspectiveCamera makeDefault fov={50} near={0.03} far={30} position={[3, 0.4, 0.8]} />
          <World sc={v.sc} r={v.r} present={present} shadows={shadows} domElement={els[i]} />
        </TrackedView>)}
        <Info />
      </Canvas>
    </div>
  );
}

function TrackedView({ track, children }: { track: React.RefObject<HTMLDivElement | null>; children: ReactNode }) {
  return <View track={track as React.RefObject<HTMLElement>}>{children}</View>;
}
