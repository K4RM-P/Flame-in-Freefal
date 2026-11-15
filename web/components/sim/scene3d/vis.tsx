"use client";
// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Per-view context: the live (interpolated) VisualState ref plus the to-scale layout of items and detector.
import { createContext, useContext, type MutableRefObject } from "react";
import * as THREE from "three";
import type { Scenario, SimResult } from "@/lib/sim/types";
import type { Layer } from "../store";
import type { VisualState } from "./frame";
import { ANCHORS, MOD } from "./Module";

export interface Layout {
  /** Leading-edge x of each item (items laid end to end along +x, schematic gap = 15 % of the longest). */
  itemX: number[];
  detector: THREE.Vector3; detClamped: boolean;
  sampleCenter: THREE.Vector3;
}
export function layoutOf(sc: Scenario): Layout {
  const Ls = sc.items.map((i) => i.length_m), gap = 0.15 * Math.max(...Ls);
  let x = ANCHORS.sample.x; const itemX = Ls.map((L) => { const x0 = x; x += L + gap; return x0; });
  const want = ANCHORS.sample.x - sc.detection.distance_m, min = MOD.X0 - 0.35;
  const end = x - gap;
  return {
    itemX, detClamped: want < min,
    detector: new THREE.Vector3(Math.max(min, want), ANCHORS.detectorY, ANCHORS.detectorZ),
    sampleCenter: new THREE.Vector3((ANCHORS.sample.x + end) / 2, ANCHORS.sample.y, ANCHORS.sample.z),
  };
}

export interface Vis { vs: MutableRefObject<VisualState>; reduced: boolean; layers: Record<Layer, boolean>; sc: Scenario; r: SimResult | null; layout: Layout }
export const VisCtx = createContext<Vis | null>(null);
export function useVis(): Vis { const v = useContext(VisCtx); if (!v) throw new Error("VisCtx missing"); return v; }
