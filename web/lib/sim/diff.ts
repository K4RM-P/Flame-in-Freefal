// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// "What changed": inputs that differ between two scenarios, and the engine outcomes side by side (A → B). Every value
// is read from the two engine results; the only arithmetic is unit display (Pa → kPa, fraction → %). Used after
// Apply & re-run, a what-if "Open as B", and any A/B compare.
import { fireEnd, type FireEnd } from "./endReason";
import { MATERIALS } from "./params";
import type { Scenario, SimResult } from "./types";
import { sig } from "@/lib/ui/format";

export interface InputChange { key: string; label: string; before: string; after: string }
export interface OutcomeRow {
  key: string; label: string; units: string; before: number | null; after: number | null;
  better: "lower" | "higher"; verdict: "better" | "worse" | "same" | "n/a"; theoryOnly: boolean; note?: string;
}
export interface RunDiff { inputs: InputChange[]; outcomes: OutcomeRow[]; endA: FireEnd; endB: FireEnd }

const matName = (k: string) => MATERIALS.find((m) => m.material_key === k)?.display_name ?? k;
const pct = (x: number) => `${sig(x * 100, 3)} %`;

export function inputChanges(a: Scenario, b: Scenario): InputChange[] {
  const out: InputChange[] = [];
  const cmp = (key: string, label: string, va: unknown, vb: unknown, fmt: (v: never) => string) => {
    if (JSON.stringify(va) !== JSON.stringify(vb)) out.push({ key, label, before: va == null ? "not set" : fmt(va as never), after: vb == null ? "not set" : fmt(vb as never) });
  };
  cmp("x_o2", "Cabin O₂", a.cabin.x_o2, b.cabin.x_o2, pct);
  cmp("P_Pa", "Cabin pressure", a.cabin.P_Pa, b.cabin.P_Pa, (v: number) => `${sig(v / 1e3, 3)} kPa`);
  cmp("gravity_g", "Gravity", a.cabin.gravity_g, b.cabin.gravity_g, (v: number) => (v === 0 ? "µg" : `${sig(v, 3)} g`));
  cmp("flow_m_s", "Ventilation flow", a.cabin.flow_m_s, b.cabin.flow_m_s, (v: number) => `${sig(v * 100, 3)} cm/s`);
  cmp("V_m3", "Cabin volume", a.cabin.V_m3, b.cabin.V_m3, (v: number) => `${sig(v, 3)} m³`);
  cmp("fan_off", "Fan off on alarm", a.cabin.fan_off_on_alarm, b.cabin.fan_off_on_alarm, (v: boolean) => (v ? "yes" : "no"));
  const n = Math.max(a.items.length, b.items.length);
  for (let i = 0; i < n; i++) {
    const ia = a.items[i], ib = b.items[i], tag = n > 1 ? ` (item ${i + 1})` : "";
    cmp(`mat${i}`, `Material${tag}`, ia?.material_key, ib?.material_key, matName);
    cmp(`th${i}`, `Thickness${tag}`, ia?.thickness_m, ib?.thickness_m, (v: number) => `${sig(v * 1e3, 3)} mm`);
  }
  cmp("det_d", "Detector distance", a.detection.distance_m, b.detection.distance_m, (v: number) => `${sig(v, 3)} m`);
  cmp("det_thr", "Detector threshold", a.detection.threshold, b.detection.threshold, (v: number) => `${sig(v, 3)} kg/m³`);
  cmp("alarm", "Crew detection (design input)", a.detection.manual_alarm_s ?? null, b.detection.manual_alarm_s ?? null, (v: number) => `t = ${sig(v, 3)} s`);
  cmp("agent", "Extinguisher agent", a.suppression.agent, b.suppression.agent, (v: string) => v);
  cmp("mass", "Agent mass", a.suppression.mass_kg, b.suppression.mass_kg, (v: number) => `${sig(v, 3)} kg`);
  cmp("delay", "Agent delay after alarm", a.suppression.delay_s, b.suppression.delay_s, (v: number) => `${sig(v, 3)} s`);
  return out;
}

const metric = (r: SimResult, k: string) => r.outcome.metrics.find((m) => m.key === k);

function verdictOf(before: number | null, after: number | null, better: "lower" | "higher", nullIs: "worst" | "na"): OutcomeRow["verdict"] {
  if (before === null && after === null) return "n/a";
  if (before === null || after === null) {
    if (nullIs === "na") return "n/a";
    return after === null ? "worse" : "better"; // time to extinguish: null = still burning = worst
  }
  const tol = 1e-9 + Math.abs(before) * 0.005;
  if (Math.abs(after - before) <= tol) return "same";
  return (better === "lower" ? after < before : after > before) ? "better" : "worse";
}

export function runDiff(a: Scenario, ra: SimResult, b: Scenario, rb: SimResult): RunDiff {
  const endA = fireEnd(ra), endB = fireEnd(rb);
  const row = (key: string, label: string, units: string, before: number | null, after: number | null, better: "lower" | "higher", nullIs: "worst" | "na" = "na", theoryOnly = false, note?: string): OutcomeRow =>
    ({ key, label, units, before, after, better, verdict: verdictOf(before, after, better, nullIs), theoryOnly, note });
  const peakQ = (r: SimResult) => r.state.reduce((m, s) => Math.max(m, s.Q_W), 0);
  const po2 = (r: SimResult) => { const v = metric(r, "min_o2")?.value ?? null; return v === null ? null : v / 1e3; };
  const co2 = (r: SimResult) => { const v = metric(r, "peak_co2")?.value ?? null; return v === null ? null : v * 100; };
  const ignited = endA.kind !== "no-fire" || endB.kind !== "no-fire";
  return {
    inputs: inputChanges(a, b), endA, endB,
    outcomes: [
      row("time_to_extinguish", "Time to extinguish", "s", metric(ra, "time_to_extinguish")?.value ?? null, metric(rb, "time_to_extinguish")?.value ?? null, "lower", ignited ? "worst" : "na", false, `${endA.short} → ${endB.short}`),
      row("peak_Q", "Peak heat release", "W", peakQ(ra), peakQ(rb), "lower"),
      row("peak_co2", "Peak CO₂", "%", co2(ra), co2(rb), "lower", "na", false, "includes any CO₂ agent released"),
      row("min_o2", "Minimum O₂ partial pressure", "kPa", po2(ra), po2(rb), "higher"),
      row("time_to_alarm", "Time to alarm", "s", metric(ra, "time_to_alarm")?.value ?? null, metric(rb, "time_to_alarm")?.value ?? null, "lower"),
      row("peak_co", "Peak CO", "mol/mol", metric(ra, "peak_co")?.value ?? null, metric(rb, "peak_co")?.value ?? null, "lower", "na", true),
    ],
  };
}
