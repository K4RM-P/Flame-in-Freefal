// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// One-at-a-time sensitivity (tornado): outcome swing when one input moves across its PSI-tested range
// (or, for design inputs without a data range, ×0.5 / ×2 — labelled as such).
import { simulate } from "./engine";
import { MATERIALS, SOLID_ENVELOPE } from "./params";
import type { Scenario } from "./types";

export interface TornadoRow { param: string; label: string; low: number | null; high: number | null; base: number | null; low_input: string; high_input: string; basis: string }

const metric = (s: Scenario, key: string): number | null => {
  try { return simulate(s).outcome.metrics.find((m) => m.key === key)?.value ?? null; } catch { return null; }
};
const clone = (s: Scenario): Scenario => JSON.parse(JSON.stringify(s));

export function sensitivity(s: Scenario, key = "peak_co"): TornadoRow[] {
  const base = metric(s, key);
  const rows: TornadoRow[] = [];
  const add = (param: string, label: string, lo: (x: Scenario) => void, hi: (x: Scenario) => void, loIn: string, hiIn: string, basis: string) => {
    const a = clone(s), b = clone(s); lo(a); hi(b);
    rows.push({ param, label, low: metric(a, key), high: metric(b, key), base, low_input: loIn, high_input: hiIn, basis });
  };
  const mats = s.items.map((i) => MATERIALS.find((m) => m.material_key === i.material_key));
  // O₂: the PSI range for the first material (else the solid-fuel envelope), always spanning the scenario value.
  const o2r = mats[0]?.o2_range ?? SOLID_ENVELOPE.x_o2 ?? null;
  if (o2r) {
    const lo = Math.min(o2r[0], s.cabin.x_o2), hi = Math.max(o2r[1], s.cabin.x_o2);
    if (hi > lo) add("x_o2", "O₂", (x) => { x.cabin.x_o2 = lo; }, (x) => { x.cabin.x_o2 = hi; }, `${(lo * 100).toFixed(1)} %`, `${(hi * 100).toFixed(1)} %`, "PSI-tested O₂ range ∪ scenario");
  }
  const fr = mats[0]?.flow_range_m_s ?? SOLID_ENVELOPE.flow_m_s ?? null;
  if (fr) {
    const lo = Math.min(fr[0], s.cabin.flow_m_s), hi = Math.max(fr[1], s.cabin.flow_m_s);
    if (hi > lo) add("flow_m_s", "Ventilation", (x) => { x.cabin.flow_m_s = lo; }, (x) => { x.cabin.flow_m_s = hi; }, `${(lo * 100).toFixed(1)} cm/s`, `${(hi * 100).toFixed(1)} cm/s`, "PSI-tested flow range ∪ scenario");
  }
  const dd = s.detection.distance_m;
  add("distance_m", "Detector distance", (x) => { x.detection.distance_m = dd * 0.5; }, (x) => { x.detection.distance_m = dd * 2; }, `${dd * 0.5} m`, `${dd * 2} m`, "design input ×0.5 / ×2 (no data range)");
  if (s.suppression.agent !== "none") {
    const dl = s.suppression.delay_s;
    add("delay_s", "Agent delay", (x) => { x.suppression.delay_s = dl * 0.5; }, (x) => { x.suppression.delay_s = dl * 2; }, `${dl * 0.5} s`, `${dl * 2} s`, "design input ×0.5 / ×2 (no data range)");
  }
  // Material: swap every item to each other ignitable PSI material; report the extremes.
  const alts = MATERIALS.filter((m) => m.ignitable);
  if (alts.length > 1) {
    const res = alts.map((m) => { const a = clone(s); a.items.forEach((i) => { i.material_key = m.material_key; }); return { m, v: metric(a, key) }; })
      .filter((r): r is { m: typeof alts[number]; v: number } => r.v !== null);
    if (res.length > 1) {
      res.sort((p, q) => p.v - q.v);
      rows.push({ param: "material", label: "Material", low: res[0].v, high: res[res.length - 1].v, base, low_input: res[0].m.display_name, high_input: res[res.length - 1].m.display_name, basis: "PSI material library" });
    }
  }
  return rows.sort((p, q) => Math.abs((q.high ?? 0) - (q.low ?? 0)) - Math.abs((p.high ?? 0) - (p.low ?? 0)));
}
