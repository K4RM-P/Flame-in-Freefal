// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// One-at-a-time sensitivity (tornado): outcome swing when one input moves across its PSI-tested range
// (or, for design inputs without a data range, ×0.5 / ×2 — labelled as such).
// sensitivityMulti() scores several metrics from ONE set of runs (used by the design review).
import { simulate } from "./engine";
import { LIMITS_SI, MATERIALS, SOLID_ENVELOPE } from "./params";
import type { Scenario, SimResult } from "./types";

export interface TornadoRow { param: string; label: string; low: number | null; high: number | null; base: number | null; low_input: string; high_input: string; basis: string }

type Runner = (s: Scenario) => SimResult | null;
type Reader = (r: SimResult, key: string) => number | null;
const defaultRun: Runner = (s) => { try { return simulate(s); } catch { return null; } };
const defaultRead: Reader = (r, key) => r.outcome.metrics.find((m) => m.key === key)?.value ?? null;
const clone = (s: Scenario): Scenario => JSON.parse(JSON.stringify(s));

interface Variant { param: string; label: string; lo: Scenario; hi: Scenario; loIn: string; hiIn: string; basis: string }

function variants(s: Scenario): { vars: Variant[]; mats: { name: string; s: Scenario }[] } {
  const vars: Variant[] = [];
  const add = (param: string, label: string, lo: (x: Scenario) => void, hi: (x: Scenario) => void, loIn: string, hiIn: string, basis: string) => {
    const a = clone(s), b = clone(s); lo(a); hi(b);
    vars.push({ param, label, lo: a, hi: b, loIn, hiIn, basis });
  };
  const mats = s.items.map((i) => MATERIALS.find((m) => m.material_key === i.material_key));
  // O₂: the PSI range for the first material (else the solid-fuel envelope), always spanning the scenario value.
  const o2r = mats[0]?.o2_range ?? SOLID_ENVELOPE.x_o2 ?? null;
  if (o2r) {
    // Never propose a cabin the crew cannot breathe: floor the low end at the sourced minimum ppO₂ (at this pressure).
    const ppFloor = LIMITS_SI.find((l) => l.key === "o2_min")?.value;
    const floorX = ppFloor && s.cabin.P_Pa > 0 ? ppFloor / s.cabin.P_Pa : 0;
    const lo = Math.min(Math.max(o2r[0], floorX), s.cabin.x_o2), hi = Math.max(o2r[1], s.cabin.x_o2);
    const floored = floorX > o2r[0] && lo > o2r[0];
    if (hi > lo) add("x_o2", "O₂", (x) => { x.cabin.x_o2 = lo; }, (x) => { x.cabin.x_o2 = hi; }, `${(lo * 100).toFixed(1)} %`, `${(hi * 100).toFixed(1)} %`, floored ? "PSI-tested O₂ range ∪ scenario, low end floored at the crew minimum ppO₂" : "PSI-tested O₂ range ∪ scenario");
  }
  const fr = mats[0]?.flow_range_m_s ?? SOLID_ENVELOPE.flow_m_s ?? null;
  if (fr) {
    const lo = Math.min(fr[0], s.cabin.flow_m_s), hi = Math.max(fr[1], s.cabin.flow_m_s);
    if (hi > lo) add("flow_m_s", "Ventilation", (x) => { x.cabin.flow_m_s = lo; }, (x) => { x.cabin.flow_m_s = hi; }, `${(lo * 100).toFixed(1)} cm/s`, `${(hi * 100).toFixed(1)} cm/s`, "PSI-tested flow range ∪ scenario");
  }
  const dd = s.detection.distance_m;
  add("distance_m", "Detector distance", (x) => { x.detection.distance_m = dd * 0.5; }, (x) => { x.detection.distance_m = dd * 2; }, `${dd * 0.5} m`, `${dd * 2} m`, "design input ×0.5 / ×2 (no data range)");
  if (s.suppression.agent !== "none") {
    const dl = s.suppression.delay_s, mk = s.suppression.mass_kg;
    add("delay_s", "Agent delay", (x) => { x.suppression.delay_s = dl * 0.5; }, (x) => { x.suppression.delay_s = dl * 2; }, `${dl * 0.5} s`, `${dl * 2} s`, "design input ×0.5 / ×2 (no data range)");
    if (mk > 0) add("mass_kg", "Agent mass", (x) => { x.suppression.mass_kg = mk * 0.5; }, (x) => { x.suppression.mass_kg = mk * 2; }, `${mk * 0.5} kg`, `${mk * 2} kg`, "design input ×0.5 / ×2 (no data range)");
  }
  // Material: swap every item to each other ignitable PSI material.
  const alts = MATERIALS.filter((m) => m.ignitable && !s.items.every((i) => i.material_key === m.material_key));
  const matVars = alts.map((m) => { const a = clone(s); a.items.forEach((i) => { i.material_key = m.material_key; }); return { name: m.display_name, s: a }; });
  return { vars, mats: matVars };
}

/** The exact edited scenario behind a tornado bar (so a lever fix can be applied and re-run). */
export function variantScenario(s: Scenario, param: string, side: "low" | "high", input: string): Scenario | null {
  const { vars, mats } = variants(s);
  if (param === "material") return mats.find((m) => m.name === input)?.s ?? null;
  const v = vars.find((x) => x.param === param);
  return v ? (side === "low" ? v.lo : v.hi) : null;
}

/** One set of runs, rows for every metric key (each sorted by swing, largest first). */
export function sensitivityMulti(s: Scenario, keys: string[], run: Runner = defaultRun, read: Reader = defaultRead): Record<string, TornadoRow[]> {
  const { vars, mats } = variants(s);
  const r0 = run(s);
  const val = (r: SimResult | null, k: string) => (r ? read(r, k) : null);
  const runs = vars.map((v) => ({ v, lo: run(v.lo), hi: run(v.hi) }));
  const mr = mats.map((m) => ({ m, r: run(m.s) }));
  const out: Record<string, TornadoRow[]> = {};
  for (const key of keys) {
    const base = val(r0, key);
    const rows: TornadoRow[] = runs.map(({ v, lo, hi }) => ({ param: v.param, label: v.label, low: val(lo, key), high: val(hi, key), base, low_input: v.loIn, high_input: v.hiIn, basis: v.basis }));
    const res = [{ name: "(current)", v: base }, ...mr.map(({ m, r }) => ({ name: m.name, v: val(r, key) }))].filter((x): x is { name: string; v: number } => x.v !== null);
    if (mr.length && res.length > 1) {
      // Report the alternative materials only (the current material is the base, not a lever).
      const alt = res.filter((x) => x.name !== "(current)").sort((p, q) => p.v - q.v);
      if (alt.length) rows.push({ param: "material", label: "Material", low: alt[0].v, high: alt[alt.length - 1].v, base, low_input: alt[0].name, high_input: alt[alt.length - 1].name, basis: "PSI material library" });
    }
    out[key] = rows.sort((p, q) => Math.abs((q.high ?? 0) - (q.low ?? 0)) - Math.abs((p.high ?? 0) - (p.low ?? 0)));
  }
  return out;
}

export function sensitivity(s: Scenario, key = "peak_co"): TornadoRow[] {
  return sensitivityMulti(s, [key])[key];
}
