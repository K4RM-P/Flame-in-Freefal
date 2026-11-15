// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// What-if questions run the engine: detect parameter changes in the question (O₂, pressure, gravity, material,
// detector, agent, fan), apply them to a copy of the scenario, and answer only with engine numbers.
import { GRAVITY, type Scenario, type SimResult } from "@/lib/sim/types";
import { CREW_RESPONSE } from "@/lib/sim/presets";
import { atmosphereById, MATERIALS } from "@/lib/sim/params";
import { metricOf, show } from "@/lib/sim/designReview";
import { matchMaterial } from "./localScenario";

export interface WhatIf { scenario: Scenario; changes: string[] }
const TRIGGER = /\b(what if|what happens if|if i|if we|suppose|try|instead|change|cut|raise|lower|increase|reduce|drop|add|use|swap|switch|remove|without)\b/i;
const pct = (x: number) => `${+(x * 100).toFixed(1)} %`;

export function parseWhatIf(q: string, s: Scenario): WhatIf | null {
  if (!TRIGGER.test(q)) return null;
  const t = q.toLowerCase();
  const c = structuredClone(s);
  const changes: string[] = [];
  const o2 = /(\d+(?:\.\d+)?)\s*%/.exec(t);
  if (o2 && /oxygen|o2|o₂/.test(t)) { const v = Number(o2[1]) / 100; if (v > 0 && v <= 1) { changes.push(`O₂ ${pct(s.cabin.x_o2)} → ${pct(v)}`); c.cabin.x_o2 = v; } }
  const kpa = /(\d+(?:\.\d+)?)\s*kpa/.exec(t);
  if (kpa) { const v = Number(kpa[1]) * 1e3; if (v > 0) { changes.push(`pressure ${+(s.cabin.P_Pa / 1e3).toFixed(1)} → ${kpa[1]} kPa`); c.cabin.P_Pa = v; } }
  const g = /\b(moon|lunar)\b/.test(t) ? GRAVITY.moon : /\bmars\b/.test(t) ? GRAVITY.mars : /\b(microgravity|orbit|zero.?g|µg)\b/.test(t) ? GRAVITY.ug : /\b(earth|1 ?g)\b/.test(t) ? GRAVITY.earth : null;
  if (g !== null && /gravity|moon|lunar|mars|orbit|earth|µg|microgravity/.test(t) && g !== s.cabin.gravity_g) { changes.push(`gravity ${s.cabin.gravity_g} → ${g} g`); c.cabin.gravity_g = g; }
  if (/\b(use|swap|switch|replace|instead)\b/.test(t)) {
    const k = matchMaterial(t);
    const m = MATERIALS.find((x) => x.material_key === k);
    if (m && c.items[0] && c.items[0].material_key !== m.material_key) { changes.push(`material → ${m.display_name}`); c.items = c.items.map((it, i) => (i === 0 ? { ...it, material_key: m.material_key, thickness_m: m.thicknesses_m[0] ?? it.thickness_m } : it)); }
  }
  if (/\b(no|remove|without)\b.*\b(detector|alarm)\b/.test(t)) { changes.push("no alarm"); c.detection.manual_alarm_s = null; }
  else if (/\b(add|with|give)\b.*\b(detector|alarm)\b/.test(t)) { changes.push(`crew alarm at ${CREW_RESPONSE.manual_alarm_s} s (design input)`); c.detection.manual_alarm_s = CREW_RESPONSE.manual_alarm_s; }
  if (/\b(no|remove|without)\b.*\b(extinguisher|agent|suppression)\b/.test(t)) { changes.push("no extinguisher"); c.suppression = { agent: "none", delay_s: 0, mass_kg: 0 }; }
  else if (/\b(n2|n₂|nitrogen)\b/.test(t)) { changes.push("agent → N₂"); c.suppression = { ...c.suppression, agent: "N2", mass_kg: c.suppression.mass_kg || CREW_RESPONSE.mass_kg, delay_s: c.suppression.delay_s || CREW_RESPONSE.delay_s }; }
  else if (/\b(co2|co₂|carbon dioxide|extinguisher)\b/.test(t) && s.suppression.agent !== "CO2") { changes.push(`agent → ${CREW_RESPONSE.mass_kg} kg CO₂ (design input)`); c.suppression = { agent: "CO2", mass_kg: CREW_RESPONSE.mass_kg, delay_s: CREW_RESPONSE.delay_s }; }
  if (/\b(fan|ventilation)\b/.test(t) && /\b(off|cut|stop|shut)\b/.test(t) && !s.cabin.fan_off_on_alarm) { changes.push("ventilation off on alarm"); c.cabin.fan_off_on_alarm = true; }
  return changes.length ? { scenario: { ...c, name: `${s.name} · what-if` }, changes } : null;
}

const KEYS = [["time_to_extinguish", "time to extinguish", "s"], ["time_to_agent", "agent release", "s"], ["peak_T", "peak temperature", "K"], ["peak_Q", "peak heat release", "W"]] as const;
/** The engine values the answer quotes (peak_Q comes from the state trace, which compact results drop). */
export const whatIfFacts = (before: SimResult, after: SimResult) => [before, after].map((r) => Object.fromEntries(KEYS.map(([k]) => [k, metricOf(r, k)])));
/** Deterministic answer: before → after for each key metric, copied from the two engine runs. */
export function whatIfAnswer(w: WhatIf, before: SimResult, after: SimResult): string {
  const parts = KEYS.map(([k, label, u]) => {
    const a = metricOf(before, k), b = metricOf(after, k);
    if (a === null && b === null) return null;
    return `${label} ${show(a, u)} → ${show(b, u)}`;
  }).filter(Boolean);
  const out = after.items.map((i) => i.extinguish_reason).find(Boolean);
  return `With ${w.changes.join(", ")}: ${parts.join("; ")}.${out ? ` The fire ends by ${out}.` : " The fire is still burning at the end of the run."} Engine run, same seed; partial-gravity and CO/smoke values keep their caveats.`;
}

/** Three questions generated from this run. */
export function suggestQuestions(s: Scenario, r: SimResult): string[] {
  const q: string[] = [];
  const released = r.events.some((e) => e.kind === "agent_released");
  if (s.suppression.agent !== "none") q.push(released && r.items.some((i) => i.extinguish_reason === "burnout") ? "Why didn't the extinguisher put it out?" : released ? "How fast did the extinguisher work?" : "Why didn't the extinguisher work?");
  else q.push("What if I add a CO₂ extinguisher?");
  const iss = atmosphereById("ISS");
  if (iss && s.cabin.x_o2 > iss.x_o2 + 1e-6) q.push(`What if I cut the oxygen to ${+(iss.x_o2 * 100).toFixed(1)}%?`);
  else q.push(s.cabin.gravity_g === GRAVITY.moon ? "What if this were in microgravity?" : "What if this were on the Moon?");
  q.push("Which NASA test is closest?");
  return q;
}
