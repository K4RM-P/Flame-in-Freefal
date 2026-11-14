"use client";
import { create } from "zustand";
import { MISSIONS } from "./missions";
import type { ModelResult } from "./physics/models";

export type Role = "safety" | "research" | "experiment";
export type Drawer = { kind: "ask"; question?: string } | { kind: "receipt"; result: ModelResult; title: string } | null;
export interface Scenario { label: string; x_o2: number; P_kPa: number; gravity_g: number; flow_cm_s: number; V_m3: number; material: string }

export interface MissionState {
  preset: string; x_o2: number; P_kPa: number; gravity_g: number; flow_cm_s: number; V_m3: number;
  material: string; role: Role; units: "SI" | "eng"; theme: "dark" | "light";
  scenarioA: Scenario | null; drawer: Drawer; railOpen: boolean; palette: boolean; present: boolean;
  set: (p: Partial<Omit<MissionState, "set" | "applyPreset">>) => void;
  applyPreset: (id: string) => void;
}
const def = MISSIONS.find((m) => m.id === "LunarHabitat") ?? MISSIONS[0];
const MISSION_KEYS = ["x_o2", "P_kPa", "gravity_g", "flow_cm_s", "V_m3"];
export const useMission = create<MissionState>((set) => ({
  preset: def.id, x_o2: def.x_o2, P_kPa: def.P_kPa, gravity_g: def.gravity_g, flow_cm_s: def.flow_cm_s, V_m3: def.V_free_m3,
  material: "sibal", role: "safety", units: "SI", theme: "dark", scenarioA: null, drawer: null, railOpen: true, palette: false, present: false,
  set: (p) => set((s) => ({ ...s, ...p, preset: p.preset ?? (Object.keys(p).some((k) => MISSION_KEYS.includes(k)) ? "Custom" : s.preset) })),
  applyPreset: (id) => {
    const m = MISSIONS.find((q) => q.id === id);
    if (m) set({ preset: m.id, x_o2: m.x_o2, P_kPa: m.P_kPa, gravity_g: m.gravity_g, flow_cm_s: m.flow_cm_s, V_m3: m.V_free_m3 });
    if (m) rememberRecent(m.id);
  },
}));

export function snapshot(s: MissionState, label: string): Scenario {
  return { label, x_o2: s.x_o2, P_kPa: s.P_kPa, gravity_g: s.gravity_g, flow_cm_s: s.flow_cm_s, V_m3: s.V_m3, material: s.material };
}

const KEYS = { m: "preset", o2: "x_o2", p: "P_kPa", g: "gravity_g", u: "flow_cm_s", v: "V_m3", mat: "material", role: "role" } as const;
const STR = new Set(["preset", "material", "role"]);
export function readUrl(search: string) {
  const q = new URLSearchParams(search);
  const out: Record<string, string | number | boolean> = {};
  for (const [k, field] of Object.entries(KEYS)) {
    const val = q.get(k);
    if (val !== null) out[field] = STR.has(field) ? val : Number(val);
  }
  if (q.get("present") === "1") out.present = true;
  return out;
}
export function toUrl(s: MissionState): string {
  const q = new URLSearchParams({ m: s.preset, o2: String(s.x_o2), p: String(s.P_kPa), g: String(s.gravity_g), u: String(s.flow_cm_s), v: String(s.V_m3), mat: s.material, role: s.role });
  if (s.present) q.set("present", "1");
  return q.toString();
}

// localStorage helpers (always wrapped: private windows may throw)
export function lsGet<T>(k: string, fallback: T): T {
  try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; }
}
export function lsSet(k: string, v: unknown) {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ }
}
function rememberRecent(id: string) {
  if (typeof window === "undefined") return;
  const r = lsGet<string[]>("ea.recent", []).filter((x) => x !== id);
  lsSet("ea.recent", [id, ...r].slice(0, 3));
}
