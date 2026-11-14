// Relevance ranking (PRD v1 formula): weighted sum of six [0,1] criteria, each explained.
import inv from "@/data/investigations.json";
import { TEST_POINTS } from "./testPoints";
import { psiEntries } from "./psi";

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface Investigation {
  id: string; name: string; family: string; fuel_class: "solid" | "liquid" | "gas"; years: string; platform: string; objective: string;
  approach: string; hardware: string; fuels: string[]; o2_range: number[] | null; p_range_kpa: number[] | null; flow_range_cm_s: number[] | null;
  diluents: string[]; variables_varied: string[]; held_constant: string[]; sensors: string[];
  key_findings: { text: string; source_id: string; locator: string }[]; pillars: string[]; psi_url: string; dois: string[]; sources: string[];
  scale: number; status: string; psi_accessions: string[];
}
export const INVESTIGATIONS: Investigation[] = Object.entries(inv as any).map(([id, v]: [string, any]) => ({ id, ...v }));

export const DEFAULT_WEIGHTS = { atmosphere: 0.3, flow: 0.15, fuel: 0.2, scale: 0.1, pillar: 0.1, data: 0.15 };
export type Weights = typeof DEFAULT_WEIGHTS;
export interface MissionLike { x_o2: number; P_kPa: number; flow_cm_s: number; pillars?: string[] }

const rangeScore = (val: number, r: number[] | null, width: number) => {
  if (!r) return { s: 0.25, why: "range not tabulated yet (0.25 prior)" };
  const d = val < r[0] ? r[0] - val : val > r[1] ? val - r[1] : 0;
  return { s: Math.exp(-((d / width) ** 2)), why: `${val} vs tested ${r[0]}–${r[1]}` };
};

export function rank(m: MissionLike, w: Weights = DEFAULT_WEIGHTS) {
  const counts: Record<string, number> = {};
  for (const t of TEST_POINTS) counts[t.investigation_id] = (counts[t.investigation_id] ?? 0) + 1;
  const pillars = m.pillars ?? ["prevention", "detection", "suppression"];
  const total = Object.values(w).reduce((a, b) => a + b, 0);
  return INVESTIGATIONS.map((iv) => {
    const o2 = rangeScore(m.x_o2, iv.o2_range, 0.05), p = rangeScore(m.P_kPa, iv.p_range_kpa, 20);
    const atmosphere = { s: 0.6 * o2.s + 0.4 * p.s, why: `O₂ ${o2.why}; P ${p.why}` };
    const flow = rangeScore(m.flow_cm_s, iv.flow_range_cm_s, 5);
    const fuel = { s: iv.fuel_class === "solid" ? 1 : iv.fuel_class === "liquid" ? 0.5 : 0.3, why: `${iv.fuel_class} fuels (cabin materials are mostly solids)` };
    const scale = { s: iv.scale, why: `sample scale index ${iv.scale}` };
    const pil = { s: iv.pillars.filter((x) => pillars.includes(x)).length / pillars.length, why: `pillars: ${iv.pillars.join(", ")}` };
    const n = counts[iv.id] ?? 0;
    const data = { s: Math.min(1, Math.log10(1 + n) / Math.log10(401)), why: `${n} verified test points in EmberAtlas` };
    const parts = { atmosphere, flow, fuel, scale, pillar: pil, data };
    const score = (Object.keys(parts) as (keyof Weights)[]).reduce((acc, k) => acc + (w[k] * parts[k].s) / total, 0);
    const live = psiEntries(iv.psi_accessions)[0];
    return { id: iv.id, name: live?.title ?? iv.name, accession: live?.accession ?? null, score, parts, n_points: n };
  }).sort((a, b) => b.score - a.score);
}
