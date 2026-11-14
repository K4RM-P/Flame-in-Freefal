import missionsJson from "@/data/missions.json";

export interface Mission { id: string; name: string; x_o2: number; P_kPa: number; gravity_g: number; flow_cm_s: number; V_free_m3: number; source: string; vNote: string }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const M = missionsJson as any;
export const MISSIONS: Mission[] = Object.entries(M).map(([id, m]: [string, any]) => ({
  id, name: m.name, x_o2: m.x_o2, P_kPa: m.P_kPa, gravity_g: m.gravity_g, flow_cm_s: m.flow_cm_s,
  V_free_m3: m.V_free_m3.value, source: m.source, vNote: `${m.V_free_m3.note} (${m.V_free_m3.status})`,
}));
export const GRAVITY_PRESETS = [
  { id: "ug", label: "µg", g: 0 }, { id: "moon", label: "Moon", g: 0.165 }, { id: "mars", label: "Mars", g: 0.378 }, { id: "earth", label: "1 g", g: 1 },
];
export const KPA_PER_PSI = 6.894757293168;
