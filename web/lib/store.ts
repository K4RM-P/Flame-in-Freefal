"use client";
import { create } from "zustand";
import { MISSIONS } from "./missions";

export interface MissionState {
  preset: string; x_o2: number; P_kPa: number; gravity_g: number; flow_cm_s: number; V_m3: number;
  set: (p: Partial<Omit<MissionState, "set" | "applyPreset">>) => void;
  applyPreset: (id: string) => void;
}
const def = MISSIONS.find((m) => m.id === "LunarHabitat") ?? MISSIONS[0];
export const useMission = create<MissionState>((set) => ({
  preset: def.id, x_o2: def.x_o2, P_kPa: def.P_kPa, gravity_g: def.gravity_g, flow_cm_s: def.flow_cm_s, V_m3: def.V_free_m3,
  set: (p) => set((s) => ({ ...s, ...p, preset: p.preset ?? (Object.keys(p).length ? "Custom" : s.preset) })),
  applyPreset: (id) => {
    const m = MISSIONS.find((q) => q.id === id);
    if (m) set({ preset: m.id, x_o2: m.x_o2, P_kPa: m.P_kPa, gravity_g: m.gravity_g, flow_cm_s: m.flow_cm_s, V_m3: m.V_free_m3 });
  },
}));

const KEYS = { m: "preset", o2: "x_o2", p: "P_kPa", g: "gravity_g", u: "flow_cm_s", v: "V_m3" } as const;
export function readUrl(search: string) {
  const q = new URLSearchParams(search);
  const out: Record<string, string | number> = {};
  for (const [k, field] of Object.entries(KEYS)) {
    const val = q.get(k);
    if (val !== null) out[field] = field === "preset" ? val : Number(val);
  }
  return out;
}
export function toUrl(s: MissionState): string {
  const q = new URLSearchParams({ m: s.preset, o2: String(s.x_o2), p: String(s.P_kPa), g: String(s.gravity_g), u: String(s.flow_cm_s), v: String(s.V_m3) });
  return q.toString();
}
