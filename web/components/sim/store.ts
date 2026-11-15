"use client";
// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Screen state for the simulator: scenario A (and B when comparing), results, playhead, receipt drawer.
import { create } from "zustand";
import type { Provenance, Scenario, SimResult, Band } from "@/lib/sim/types";

export interface ReceiptPayload { title: string; value: number | null; units: string; band?: Band; sources: Provenance[]; note?: string }
export type Interp = { state: "idle" | "loading" | "ok" | "error"; text?: string; citations?: string[]; error?: string };
export type View = "3d" | "elevation" | "section";
export type Layer = "geometry" | "heat" | "smoke" | "airflow" | "detector" | "suppression" | "module" | "crew" | "labels";
export const LAYERS: { k: Layer; label: string }[] = [
  { k: "geometry", label: "Cabin" }, { k: "heat", label: "Flame / heat" }, { k: "smoke", label: "Smoke" },
  { k: "airflow", label: "Airflow" }, { k: "detector", label: "Detector" }, { k: "suppression", label: "Suppression" },
  { k: "module", label: "Module detail (3D)" }, { k: "crew", label: "Crew (3D)" }, { k: "labels", label: "Labels (3D)" },
];
/** Viewport chrome remembered across reloads (browser only; every access guarded). */
export interface UiPrefs { dockOpen: boolean; dockVh: number; treeOpen: boolean | null }
const UI_KEY = "ea.ui3d";
function loadUi(): UiPrefs {
  const d: UiPrefs = { dockOpen: false, dockVh: 38, treeOpen: null };
  try { if (typeof window === "undefined") return d; const v = JSON.parse(window.localStorage.getItem(UI_KEY) ?? "null"); return v && typeof v === "object" ? { ...d, ...v } : d; } catch { return d; }
}
export function saveUi(p: Partial<UiPrefs>) {
  try { const cur = loadUi(); window.localStorage.setItem(UI_KEY, JSON.stringify({ ...cur, ...p })); } catch { /* storage unavailable */ }
}
export { loadUi };
/** Playback cadence (ms per engine frame); the 3D view interpolates between frames at this rate. */
export const PLAYBACK = { stepMs: 33, fi: 0 };
/** Identity of the inputs a result was computed for (stale results re-run on Play). */
export const keyOf = (a: Scenario | null, b: Scenario | null) => JSON.stringify([a, b]);
export interface ChatMsg { role: "user" | "assistant"; text: string; citations?: string[]; facts?: string[]; error?: boolean; stripped?: boolean }
export interface Sens { scenario: Scenario; key: string; rows: unknown[] }

interface SimState {
  a: Scenario | null; b: Scenario | null; editing: "a" | "b"; presetId: string | null; replay: boolean;
  ra: SimResult | null; rb: SimResult | null; running: boolean; runError: string | null; frame: number;
  receipt: ReceiptPayload | null; interp: Interp; topOpen: boolean;
  playing: boolean; view: View; layers: Record<Layer, boolean>; rightTab: "outputs" | "evidence" | "assistant"; dockTab: string;
  assumptionsOpen: boolean; dockOpen: boolean; dockVh: number; treeOpen: boolean; camPreset: { id: number; nonce: number } | null; present: boolean; speed: number; ranKey: string | null;
  sens: Sens | null; chat: ChatMsg[]; asking: boolean;
  set: (p: Partial<Omit<SimState, "set" | "patch">>) => void;
  patch: (fn: (s: Scenario) => Scenario) => void;
}
export const useSim = create<SimState>((set) => ({
  a: null, b: null, editing: "a", presetId: null, replay: false,
  ra: null, rb: null, running: false, runError: null, frame: 0, receipt: null, interp: { state: "idle" }, topOpen: true,
  playing: false, view: "3d", layers: { geometry: true, heat: true, smoke: true, airflow: true, detector: true, suppression: true, module: true, crew: true, labels: false },
  dockOpen: false, dockVh: 38, treeOpen: true, camPreset: null, present: false, speed: 1, ranKey: null,
  rightTab: "outputs", dockTab: "T_K", assumptionsOpen: false, sens: null, chat: [], asking: false,
  set: (p) => set(p),
  patch: (fn) => set((s) => {
    const k = s.editing === "b" && s.b ? "b" : "a";
    const cur = s[k];
    return cur ? { [k]: fn(structuredClone(cur)), presetId: k === "a" ? s.presetId : s.presetId } as Partial<SimState> : {};
  }),
}));
