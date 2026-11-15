"use client";
// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Constrained orbit inside the aisle (camera clamped 0.15 m inside the rack faces), four presets with smooth
// tweens, double-click focus, and the cinematic dolly for ?present=1. Never moves on its own with reduced motion.
import { CameraControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useImperativeHandle, useRef, type Ref } from "react";
import * as THREE from "three";
import { useSim } from "../store";
import { ANCHORS, MOD } from "./Module";
import { useVis, type Layout } from "./vis";
import type { VisualState } from "./frame";

export interface Shot { pos: THREE.Vector3; target: THREE.Vector3; label: string }
export const PRESET_LABELS = ["Overview", "Sample close-up", "Detector", "Hatch"] as const;

export function shots(l: Layout, flame?: THREE.Vector3): { def: Shot; list: Shot[] } {
  const s = l.sampleCenter, d = l.detector, fl = flame ?? s;
  const clampV = (v: THREE.Vector3) => ANCHORS.camBox.clampPoint(v, v);
  const def = { pos: clampV(s.clone().add(new THREE.Vector3(2.45, 0.42, 1.38))), target: s.clone(), label: "Default" };
  return {
    def,
    list: [
      { pos: clampV(new THREE.Vector3(MOD.X1 - 0.75, 0.38, 0.55)), target: new THREE.Vector3(MOD.X0, -0.05, -0.2), label: PRESET_LABELS[0] },
      { pos: clampV(fl.clone().add(new THREE.Vector3(0.24, 0.12, 0.54))), target: fl.clone(), label: PRESET_LABELS[1] },
      { pos: clampV(new THREE.Vector3(d.x - 0.15, MOD.HALF - 0.16, d.z + 0.3)), target: s.clone(), label: PRESET_LABELS[2] },
      { pos: clampV(new THREE.Vector3(MOD.X0 - 0.2, 0.15, 0.35)), target: s.clone(), label: PRESET_LABELS[3] },
    ],
  };
}

/** Where the flame is right now (engine front − half the burning length), else the sample centre. */
function flamePoint(v: VisualState, l: Layout) {
  const i = v.items.findIndex((x) => x.flamePresent); if (i < 0) return l.sampleCenter.clone();
  const it = v.items[i]; return new THREE.Vector3(l.itemX[i] + Math.max(it.burnLen_m / 2, it.front_m - it.burnLen_m / 2), ANCHORS.sample.y, ANCHORS.sample.z);
}

export interface RigApi { focus: (p: THREE.Vector3) => void }

export function CameraRig({ present = false, apiRef, domElement }: { present?: boolean; apiRef?: Ref<RigApi>; domElement?: HTMLElement | null }) {
  const cc = useRef<CameraControls>(null);
  const { layout, reduced, vs } = useVis();
  const camPreset = useSim((s) => s.camPreset);
  const S = shots(layout);
  const sKey = `${layout.sampleCenter.toArray().join()}|${layout.detector.toArray().join()}`;

  useEffect(() => {
    const c = cc.current; if (!c) return;
    c.setBoundary(ANCHORS.camBox); (c as unknown as { boundaryEnclosesCamera: boolean }).boundaryEnclosesCamera = true;
    c.smoothTime = 0.28; c.draggingSmoothTime = 0.08; c.minDistance = 0.12; c.maxDistance = 7.5; c.dollyToCursor = true;
    c.setLookAt(...S.def.pos.toArray(), ...S.def.target.toArray(), false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    // Re-aim (without a flash) only when the to-scale layout itself changes, e.g. a longer sample.
    const c = cc.current; if (!c) return;
    c.setTarget(...S.def.target.toArray(), !reduced);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sKey]);
  useEffect(() => {
    const c = cc.current; if (!c || !camPreset) return;
    const shot = shots(layout, flamePoint(vs.current, layout)).list[camPreset.id - 1]; if (!shot) return;
    c.setLookAt(...shot.pos.toArray(), ...shot.target.toArray(), !reduced);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camPreset?.nonce]);
  useImperativeHandle(apiRef, () => ({
    focus: (p: THREE.Vector3) => {
      const c = cc.current; if (!c) return;
      const cam = c.camera.position.clone(), dir = cam.sub(p).normalize();
      const pos = ANCHORS.camBox.clampPoint(p.clone().add(dir.multiplyScalar(0.8)), new THREE.Vector3());
      c.setLookAt(...pos.toArray(), ...p.toArray(), !reduced);
    },
  }));

  const tmpP = useRef(new THREE.Vector3()), tmpT = useRef(new THREE.Vector3());
  useFrame(() => {
    if (!present || reduced) return;
    const c = cc.current; if (!c) return;
    const st = vs.current; const u = st.N > 1 ? st.frame / (st.N - 1) : 0;
    const e = u * u * (3 - 2 * u);
    const a = S.list[0], b = S.list[1];
    // slow dolly Overview → close-up; target eases from mid-aisle (detector + beacon in view) onto the sample
    tmpP.current.lerpVectors(a.pos, b.pos.clone().add(new THREE.Vector3(0.5, 0.15, 0.2)), e);
    tmpT.current.lerpVectors(layout.detector.clone().lerp(layout.sampleCenter, 0.6), b.target, e);
    c.setLookAt(...tmpP.current.toArray(), ...tmpT.current.toArray(), true);
  });

  return <CameraControls ref={cc} makeDefault domElement={domElement ?? undefined} />;
}
