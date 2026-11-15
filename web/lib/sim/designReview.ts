// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Deterministic design review ("Prevent"): rule-based gaps first, then the largest one-at-a-time sensitivity swings
// (lib/sim/sensitivity.ts, shared memoized runs) turned into plain-English fixes. No API; numbers are copied from engine
// results, never recomputed. Honesty: a fix whose metric rests on an uncalibrated sub-model is "theory-only" and can never
// outrank a rule-based or calibrated fix; partial-gravity results are estimates, never measurements.
import { simulate } from "./engine";
import { MATERIALS, insideRange, tolerantRange } from "./params";
import { CREW_RESPONSE } from "./presets";
import { sensitivityMulti, type TornadoRow } from "./sensitivity";
import type { Scenario, SimResult } from "./types";
import { sig } from "@/lib/ui/format";

export interface DesignFix {
  id: string; title: string; detail: string; metric: string; before: number | null; after: number | null; units: string;
  effect: number; basis: "calibrated" | "theory-only" | "design-input"; inEnvelope: boolean; sources: string[];
}

/** Metrics the review scores, with the direction that is safer. `peak_Q` is read from the state trace. */
export const REVIEW_METRICS = [
  { key: "time_to_extinguish", label: "time to extinguish", units: "s", better: "lower" as const, deps: ["spread"] },
  { key: "peak_Q", label: "peak heat release", units: "W", better: "lower" as const, deps: ["spread"] },
  { key: "min_o2", label: "minimum O₂ partial pressure", units: "Pa", better: "higher" as const, deps: ["spread"] },
  { key: "peak_co", label: "peak CO", units: "mol/mol", better: "lower" as const, deps: ["spread", "smoke"] },
];
type MetricKey = (typeof REVIEW_METRICS)[number]["key"];

export function metricOf(r: SimResult, key: string): number | null {
  if (key === "peak_Q") return r.state.reduce((m, s) => Math.max(m, s.Q_W), 0);
  if (key === "time_to_agent") return r.events.find((e) => e.kind === "agent_released")?.t_s ?? null;
  return r.outcome.metrics.find((m) => m.key === key)?.value ?? null;
}
const basisOf = (r: SimResult, deps: string[]): DesignFix["basis"] =>
  deps.every((d) => r.provenance.params[d]?.calibrated) ? "calibrated" : "theory-only";
/** Display string used in `detail`; tests check it against the engine value with the same formatter. */
export const show = (v: number | null, units: string) => (v === null ? "never" : `${sig(v, 3)} ${units}`);

const clone = (s: Scenario): Scenario => JSON.parse(JSON.stringify(s));
const memo = new Map<string, SimResult | null>();
/** Memoized deterministic run; null when the engine refuses the scenario (e.g. no cabin volume). */
export function runCached(s: Scenario): SimResult | null {
  const k = JSON.stringify(s);
  if (!memo.has(k)) { let r: SimResult | null = null; try { r = simulate(s); } catch { r = null; } if (memo.size > 200) memo.clear(); memo.set(k, r); }
  return memo.get(k) ?? null;
}

/** Score a change: "never extinguished" (null) is worse than any finite time; relative improvement otherwise. */
function gain(before: number | null, after: number | null, better: "lower" | "higher", key: string): number {
  if (key === "time_to_extinguish") {
    if (before === null && after !== null) return 1;
    if (after === null || before === null) return 0;
  }
  if (before === null || after === null) return 0;
  const d = better === "lower" ? before - after : after - before;
  return Math.abs(before) > 0 ? d / Math.abs(before) : d > 0 ? 1 : 0;
}

const ignitionOutOfO2 = (s: Scenario) => s.items.filter((i) => i.ignite).map((i) => MATERIALS.find((m) => m.material_key === i.material_key))
  .filter((m): m is NonNullable<typeof m> => !!m?.o2_range && !insideRange(s.cabin.x_o2, tolerantRange(m.o2_range, "x_o2")));

export function designReview(s: Scenario, r: SimResult): DesignFix[] {
  const rule: DesignFix[] = [];
  const hasAgent = s.suppression.agent !== "none" && s.suppression.mass_kg > 0;
  const alarmed = r.events.some((e) => e.kind === "alarm");
  const DI = ["design input"];

  // --- rule-based checks (always first) ---
  if (hasAgent && !alarmed) {
    const fixed = clone(s); fixed.detection.manual_alarm_s = CREW_RESPONSE.manual_alarm_s;
    const rf = runCached(fixed);
    const tA = rf ? metricOf(rf, "time_to_agent") : null;
    const te0 = metricOf(r, "time_to_extinguish"), te1 = rf ? metricOf(rf, "time_to_extinguish") : null;
    const why = rf?.items.map((i) => i.extinguish_reason).find(Boolean);
    const fails = why === "burnout" || te1 === null || (te0 !== null && te1 >= te0);
    const tail = fails ? ` Even then the ${s.suppression.mass_kg} kg charge does not put this fire out${why === "burnout" ? " (it ends by burnout)" : ""}: size the agent next.` : "";
    rule.push({ id: "alarm-path", title: "Give the detector an alarm level / detection path", metric: "time_to_agent", before: null, after: tA, units: "s",
      detail: `The ${s.suppression.mass_kg} kg ${s.suppression.agent} extinguisher never fires: no alarm can trigger (no sourced smoke yield or detector threshold, no crew-detection input). With crew detection at t = ${CREW_RESPONSE.manual_alarm_s} s (design input), the agent is released at ${show(tA, "s")}; time to extinguish ${show(te0, "s")} → ${show(te1, "s")}.${tail}`,
      effect: 1, basis: "design-input", inEnvelope: true, sources: DI });
  }
  if (!hasAgent) {
    const fixed = clone(s); fixed.suppression = { agent: CREW_RESPONSE.agent, delay_s: CREW_RESPONSE.delay_s, mass_kg: CREW_RESPONSE.mass_kg };
    if (!alarmed) fixed.detection.manual_alarm_s = CREW_RESPONSE.manual_alarm_s;
    const rf = runCached(fixed);
    const b = metricOf(r, "time_to_extinguish"), a = rf ? metricOf(rf, "time_to_extinguish") : null;
    rule.push({ id: "add-suppression", title: "Add suppression", metric: "time_to_extinguish", before: b, after: a, units: "s",
      detail: `No extinguisher is fitted. A ${CREW_RESPONSE.mass_kg} kg ${CREW_RESPONSE.agent} release ${CREW_RESPONSE.delay_s} s after the alarm (design input) changes time to extinguish ${show(b, "s")} → ${show(a, "s")}.`,
      effect: 0.9, basis: "design-input", inEnvelope: true, sources: DI });
  }
  if (!s.cabin.fan_off_on_alarm && s.cabin.flow_m_s > 0) {
    const fixed = clone(s); fixed.cabin.fan_off_on_alarm = true;
    const rf = runCached(fixed);
    const b = metricOf(r, "time_to_extinguish"), a = rf ? metricOf(rf, "time_to_extinguish") : null;
    rule.push({ id: "fan-off", title: "Cut ventilation on alarm", metric: "time_to_extinguish", before: b, after: a, units: "s",
      detail: `Ventilation (${sig(s.cabin.flow_m_s * 100, 3)} cm/s) keeps feeding the flame after the alarm. Stopping it on alarm changes time to extinguish ${show(b, "s")} → ${show(a, "s")}${alarmed ? "" : " (needs an alarm first)"}.`,
      effect: 0.8, basis: "design-input", inEnvelope: true, sources: DI });
  }
  for (const m of ignitionOutOfO2(s)) {
    rule.push({ id: `o2-envelope-${m.material_key}`, title: `${m.display_name} is untested at this O₂`, metric: "x_o2", before: s.cabin.x_o2 * 100, after: m.o2_range![1] * 100, units: "% O₂",
      detail: `The ignition material ${m.display_name} was tested only at ${sig(m.o2_range![0] * 100, 3)}–${sig(m.o2_range![1] * 100, 3)} % O₂; this cabin runs ${sig(s.cabin.x_o2 * 100, 3)} % O₂. Its predictions here are extrapolations: test it at this O₂ or swap it for a material tested there.`,
      effect: 0, basis: "design-input", inEnvelope: false, sources: m.sources.slice(0, 2).map((x) => x.source_id) });
  }

  // --- sensitivity levers (shared memoized runs across all metrics) ---
  const rows = sensitivityMulti(s, REVIEW_METRICS.map((m) => m.key), runCached, (rr, k) => metricOf(rr, k));
  const best = new Map<string, DesignFix>();
  for (const M of REVIEW_METRICS) {
    const basis = basisOf(r, M.deps);
    for (const row of rows[M.key as MetricKey] ?? []) {
      const before = metricOf(r, M.key);
      const cands = [{ v: row.low, inp: row.low_input, side: "low" as const }, { v: row.high, inp: row.high_input, side: "high" as const }];
      for (const c of cands) {
        const e = gain(before, c.v, M.better, M.key);
        if (!(e > 0.01)) continue;
        const fix = leverFix(s, row, c.side, c.inp, M, before, c.v, e, basis);
        const prev = best.get(row.param);
        if (!prev || rank(fix) < rank(prev) || (rank(fix) === rank(prev) && fix.effect > prev.effect)) best.set(row.param, fix);
      }
    }
  }
  const levers = [...best.values()];
  const tier = (f: DesignFix) => (!f.id.startsWith("lever-") ? 0 : f.basis === "theory-only" ? 2 : 1);
  return [...rule, ...levers].sort((a, b) => tier(a) - tier(b) || Number(b.inEnvelope) - Number(a.inEnvelope) || b.effect - a.effect);
}
const rank = (f: DesignFix) => (f.basis === "theory-only" ? 1 : 0);

function leverFix(s: Scenario, row: TornadoRow, side: "low" | "high", input: string, M: (typeof REVIEW_METRICS)[number],
  before: number | null, after: number | null, effect: number, basis: DesignFix["basis"]): DesignFix {
  const mat = MATERIALS.find((m) => m.material_key === s.items[0]?.material_key);
  let title = row.label, inEnvelope = true;
  switch (row.param) {
    case "x_o2": title = `Set cabin O₂ to ${input}`; inEnvelope = !!mat?.o2_range && insideRange(Number(input.replace(/[^\d.]/g, "")) / 100, tolerantRange(mat.o2_range, "x_o2")); break;
    case "flow_m_s": title = `${side === "low" ? "Reduce" : "Increase"} ventilation to ${input}`; inEnvelope = !!mat?.flow_range_m_s && insideRange(Number(input.replace(/[^\d.]/g, "")) / 100, tolerantRange(mat.flow_range_m_s, "flow_m_s")); break;
    case "distance_m": title = `Move the detector to ${input}`; break;
    case "delay_s": title = `Release the agent ${side === "low" ? "sooner" : "later"} (${input} after alarm)`; break;
    case "mass_kg": title = `${side === "low" ? "Smaller" : "Larger"} agent charge (${input})`; break;
    case "material": {
      title = `Swap the material to ${input}`;
      const alt = MATERIALS.find((m) => m.display_name === input);
      inEnvelope = !!alt?.o2_range && insideRange(s.cabin.x_o2, tolerantRange(alt.o2_range, "x_o2"));
      break;
    }
  }
  const pg = s.cabin.gravity_g > 0 && s.cabin.gravity_g < 1 ? " Partial-gravity estimate (may be non-conservative), not a measurement." : "";
  const th = basis === "theory-only" ? " Theory-only: this metric uses an uncalibrated sub-model." : "";
  return {
    id: `lever-${row.param}`, title, metric: M.key, before, after, units: M.units, effect, basis, inEnvelope,
    detail: `${M.label[0].toUpperCase()}${M.label.slice(1)} ${show(before, M.units)} → ${show(after, M.units)} (${row.basis}).${inEnvelope ? "" : " Outside the PSI-tested envelope."}${th}${pg}`,
    sources: [row.basis],
  };
}
