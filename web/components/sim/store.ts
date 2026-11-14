"use client";
// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Screen state for the simulator: scenario A (and B when comparing), results, playhead, receipt drawer.
import { create } from "zustand";
import type { Provenance, Scenario, SimResult, Band } from "@/lib/sim/types";

export interface ReceiptPayload { title: string; value: number | null; units: string; band?: Band; sources: Provenance[]; note?: string }
export type Interp = { state: "idle" | "loading" | "ok" | "error"; text?: string; citations?: string[]; error?: string };
export type View = "elevation" | "section";
export type Layer = "geometry" | "heat" | "smoke" | "airflow" | "detector" | "suppression";
export const LAYERS: { k: Layer; label: string }[] = [
  { k: "geometry", label: "Cabin" }, { k: "heat", label: "Flame / heat" }, { k: "smoke", label: "Smoke" },
  { k: "airflow", label: "Airflow" }, { k: "detector", label: "Detector" }, { k: "suppression", label: "Suppression" },
];
export interface ChatMsg { role: "user" | "assistant"; text: string; citations?: string[]; facts?: string[]; error?: boolean; stripped?: boolean }
export interface Sens { scenario: Scenario; key: string; rows: unknown[] }

interface SimState {
  a: Scenario | null; b: Scenario | null; editing: "a" | "b"; presetId: string | null; replay: boolean;
  ra: SimResult | null; rb: SimResult | null; running: boolean; runError: string | null; frame: number;
  receipt: ReceiptPayload | null; interp: Interp; topOpen: boolean;
  playing: boolean; view: View; layers: Record<Layer, boolean>; rightTab: "outputs" | "evidence" | "assistant"; dockTab: string;
  assumptionsOpen: boolean; sens: Sens | null; chat: ChatMsg[]; asking: boolean;
  set: (p: Partial<Omit<SimState, "set" | "patch">>) => void;
  patch: (fn: (s: Scenario) => Scenario) => void;
}
export const useSim = create<SimState>((set) => ({
  a: null, b: null, editing: "a", presetId: null, replay: false,
  ra: null, rb: null, running: false, runError: null, frame: 0, receipt: null, interp: { state: "idle" }, topOpen: true,
  playing: false, view: "elevation", layers: { geometry: true, heat: true, smoke: true, airflow: true, detector: true, suppression: true },
  rightTab: "outputs", dockTab: "T_K", assumptionsOpen: false, sens: null, chat: [], asking: false,
  set: (p) => set(p),
  patch: (fn) => set((s) => {
    const k = s.editing === "b" && s.b ? "b" : "a";
    const cur = s[k];
    return cur ? { [k]: fn(structuredClone(cur)), presetId: k === "a" ? s.presetId : s.presetId } as Partial<SimState> : {};
  }),
}));
