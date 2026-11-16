// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Deterministic run explainer ("Aster offline", and the draft the AI model must stay grounded on). Routes the question
// to an intent and composes an answer ONLY from RunFacts: engine numbers, end reasons, the evidence ranking, the design
// review, the next test and sourced caveats (FM2, the quench limit). No number is invented; the guard re-checks them.
import { sig } from "@/lib/ui/format";
import sourcesJson from "@/data/sources.json";
import type { RunFacts, SideFacts } from "./runFactsSchema";

export type Intent = "fix" | "extinguisher" | "next-test" | "duration" | "gravity" | "oxygen" | "evidence" | "summary";
export interface SourceLink { id: string; label: string; url: string }
export interface Explanation { intent: Intent; text: string; citations: string[]; links: SourceLink[]; followUps: string[] }

const SOURCES = sourcesJson as Record<string, { title?: string; url?: string }>;

/** First matching rule wins; order matters ("why didn't the extinguisher…" is about the extinguisher, not duration). */
const RULES: [Intent, RegExp][] = [
  ["fix", /\b(fix|fixes|safer|prevent|mitigat\w*|improve|reduce|what should (?:i|we) (?:do|change)|design change|recommend)/i],
  ["next-test", /\b(next test|test next|fly next|which test should|what should nasa test|new test|propose\w* (?:a )?test)/i],
  ["extinguisher", /(extinguish(?:er)?|co2|co₂|agent|suppress\w*|discharge|nitrogen|\bn2\b)/i],
  ["duration", /(longer|shorter|\blast(?:s|ed)?\b|faster|slower|still burn|keep(?:s)? burning|go(?:es)? out|went out|why .*\b(?:out|end|stop)|differen|compare|\bvs\b|versus)/i],
  ["gravity", /(gravit|\bmoon\b|lunar|\bmars\b|microgravity|\bµg\b|\bug\b|1\/6|buoyan|partial)/i],
  ["oxygen", /(oxygen|\bo2\b|o₂|pressure|atmospher|\bppo)/i],
  ["evidence", /(nasa|\bpsi\b|experiment|evidence|data|closest|saffire|bass|flex|study|studies|measured|tested)/i],
];
export function intentOf(q: string): Intent {
  return RULES.find(([, re]) => re.test(q))?.[0] ?? "summary";
}

const s3 = (x: number) => sig(x, 3);
const secs = (x: number | null) => (x === null ? "never" : `${s3(x)} s`);
const kW = (w: number) => `${sig(w / 1e3, 2)} kW`;
const gName = (g: number) => (g === 0 ? "microgravity" : `${s3(g)} g`);

function endLine(s: SideFacts): string {
  if (s.end.kind === "no-fire") return `${s.label}: nothing ignited.`;
  if (s.end.t_s === null) return `${s.label}: ${s.end.phrase}.`;
  return `${s.label}: fire out at ${secs(s.end.t_s)}, ${s.end.phrase}.`;
}

function mechanism(s: SideFacts, f: RunFacts): string | null {
  if (s.end.kind === "quench" && s.gravity_g === 0)
    return `${s.label} is in microgravity, so there is no buoyant flow${s.fan_off_s !== null ? `; once the fan stopped at ${secs(s.fan_off_s)}` : ""} nothing moved air past the flame, it fell below the ${s3(f.quench.cm_s)} cm/s low-flow quench limit and went out at ${secs(s.end.t_s)}.`;
  if (s.end.kind === "burnout" && s.gravity_g > 0)
    return `${s.label} has gravity (${gName(s.gravity_g)}), which drives a buoyant flow past the flame even with the fan off, so it stays above the quench limit and keeps spreading until the ${s.material} sample is used up at ${secs(s.end.t_s)}.`;
  return null;
}

const SPREAD_NOTE = "In this engine a thin fabric's spread rate does not depend on air speed, so gravity changes the outcome only by deciding whether the flame stays above the quench limit.";

function partialGCaveat(f: RunFacts): string | null {
  const pg = f.sides.find((s) => s.gravity_g > 0 && s.gravity_g < 1);
  if (!pg) return null;
  return `Caveat: ${gName(pg.gravity_g)} is an estimate between microgravity and 1 g, not a measurement. NASA's FM2 lunar-gravity tests (NTRS 20240015307, outside PSI) report: "${f.fm2.note.replace(/^FM2 lunar-gravity tests: /, "")}" This result may therefore be non-conservative.`;
}

function quenchCaveat(f: RunFacts): string | null {
  if (!f.sides.some((s) => s.end.kind === "quench" || s.gravity_g > 0)) return null;
  const low = /below (\d+(?:\.\d+)?) cm\/s/.exec(f.quench.note)?.[1];
  return `The ${s3(f.quench.cm_s)} cm/s quench limit comes from BASS-II (${f.quench.source}${f.quench.status === "TODO_VERIFY" ? ", still marked TODO_VERIFY" : ""})${low ? `, and some BASS-II flames survived below ${low} cm/s` : ""}, so treat it as uncertain.`;
}

function oxygenLine(s: SideFacts): string {
  const max = s.material_max_o2_pct;
  const env = max === null ? "PSI has no tested O₂ range for this material" : s.x_o2_pct > max ? `above the highest O₂ this material was burned at in PSI (${s3(max)}%), so the result is extrapolated` : `inside the O₂ range this material was tested at in PSI (up to ${s3(max)}%)`;
  return `${s.label} breathes ${s3(s.x_o2_pct)}% O₂ at ${s3(s.P_kPa)} kPa: ${env}. Peak heat release ${kW(s.peak_heat_W)}.`;
}

function extinguisherLine(s: SideFacts): string {
  if (s.agent === "none" || s.agent_kg <= 0) return `${s.label}: no extinguisher is fitted.`;
  if (s.agent_s === null) return `${s.label}: the ${s3(s.agent_kg)} kg ${s.agent} extinguisher never fired${s.alarm_s === null ? " because no alarm was raised (no detector threshold or crew alarm reached it)" : ""}.`;
  const outcome = s.end.kind === "inerting" ? "the agent inerted the flame" : s.end.kind === "quench" ? "the flame had already been quenched by low flow" : s.end.kind === "burnout" ? "the fire burned out anyway: the agent did not push the flame temperature below the extinction limit before the sample was consumed" : "the fire was still burning at the end of the run";
  const order = s.end.t_s !== null && s.end.t_s <= s.agent_s ? ` The fire was already out at ${secs(s.end.t_s)}, before the release.` : "";
  return `${s.label}: ${s3(s.agent_kg)} kg ${s.agent} released at ${secs(s.agent_s)} (alarm at ${secs(s.alarm_s)}); ${outcome}.${order}`;
}

function evidenceLine(s: SideFacts): string {
  if (!s.evidence.length) return `${s.label}: no ranked PSI evidence for this material.`;
  return `Closest NASA evidence for ${s.label}: ${s.evidence.map((e) => `${e.accession} ${e.title}${e.role ? ` (${e.role})` : ""}`).join("; ")}.`;
}

function fixLine(s: SideFacts): string {
  if (!s.fixes.length) return `${s.label}: the design review found no fix that changes the outcome.`;
  return `Design review for ${s.label} (deterministic, ranked): ${s.fixes.map((x, i) => `${i + 1}. ${x.title} (${x.before} → ${x.after}; ${x.basis})`).join(" ")}`;
}

function nextTestLine(s: SideFacts): string {
  if (!s.next_test) return `${s.label} sits inside the PSI test envelope, so no new test is needed for it.`;
  return `Next test for ${s.label}: ${s.next_test.condition}. Rig: ${s.next_test.rig}`;
}

const FOLLOW: Record<Intent, string> = {
  duration: "Why does the fire last longer in one cabin?",
  extinguisher: "Why didn't the extinguisher put it out?",
  gravity: "What does gravity change in this run?",
  oxygen: "How far outside NASA's tested oxygen is this?",
  evidence: "Which NASA test is closest?",
  fix: "What should we fix first?",
  "next-test": "What test should NASA fly next?",
  summary: "Summarise this run",
};

export function followUpsFor(f: RunFacts, intent: Intent | null = null): string[] {
  const order: Intent[] = f.sides.length > 1 ? ["duration", "fix", "extinguisher", "gravity", "evidence", "next-test"] : ["fix", "extinguisher", "oxygen", "evidence", "next-test", "gravity"];
  return order.filter((i) => i !== intent).slice(0, 3).map((i) => FOLLOW[i]);
}

export function explainRun(question: string, f: RunFacts): Explanation {
  const intent = intentOf(question);
  const [A, B] = f.sides;
  const sides = f.sides;
  const out: string[] = [];
  const primary = B ?? A; // with a comparison, the second cabin is usually the design under study
  switch (intent) {
    case "duration": {
      if (B && f.compare && f.compare.ratio < 1.05) out.push(`In this run both fires last about as long (${sides.map((s) => `${s.label} ${secs(s.end.t_s)}`).join(", ")}).`);
      else if (B && f.compare) out.push(`In this run the fire lasts ${s3(f.compare.ratio)}× longer in ${f.compare.longer} than in ${f.compare.shorter}, and the two fires end for different reasons.`);
      for (const s of sides) out.push(mechanism(s, f) ?? endLine(s));
      if (B) out.push(`Oxygen also matters: ${sides.map((s) => `${s.label} ${s3(s.x_o2_pct)}% O₂ (peak ${kW(s.peak_heat_W)})`).join(" vs ")}.`);
      out.push(SPREAD_NOTE);
      break;
    }
    case "extinguisher": out.push(...sides.map(extinguisherLine)); break;
    case "gravity":
      out.push(SPREAD_NOTE);
      for (const s of sides) out.push(mechanism(s, f) ?? `${s.label}: ${gName(s.gravity_g)}, ${s.end.short}${s.end.t_s !== null ? ` at ${secs(s.end.t_s)}` : ""}.`);
      break;
    case "oxygen": out.push(...sides.map(oxygenLine)); break;
    case "evidence": out.push(...[...new Map(sides.map((s) => [s.material, s])).values()].map(evidenceLine)); break;
    case "fix": out.push(fixLine(primary)); break;
    case "next-test": out.push(nextTestLine(primary)); break;
    default:
      out.push(...sides.map((s) => `${endLine(s)} Peak heat release ${kW(s.peak_heat_W)}; alarm ${secs(s.alarm_s)}.`));
      if (B && f.compare && f.compare.ratio >= 1.05) out.push(`The fire lasts ${s3(f.compare.ratio)}× longer in ${f.compare.longer}.`);
  }
  if (intent === "duration" || intent === "gravity") { const q = quenchCaveat(f); if (q) out.push(q); }
  const pg = partialGCaveat(f);
  if (pg && intent !== "evidence" && intent !== "fix") out.push(pg);
  if (sides.some((s) => s.extrapolated.length) && intent !== "next-test") out.push("Inputs outside NASA's tested range are extrapolated; see the Extrapolated badge for which ones.");

  const text = out.join(" ");
  // Citations: PSI evidence for the materials discussed (+ any named in the text), FM2 and the quench source as links.
  const psi = new Set<string>([...sides.flatMap((s) => [...s.material_sources, ...s.evidence.slice(0, intent === "evidence" ? 4 : 1).map((e) => e.accession)]), ...(text.match(/PSI-\d+/g) ?? [])]);
  if (/quench/.test(text)) psi.add("PSI-25");
  if (intent === "next-test") for (const s of sides) s.next_test?.investigations.forEach((i) => psi.add(i));
  const links: SourceLink[] = [];
  const add = (id: string) => { const s = SOURCES[id]; if (s?.url && !links.some((l) => l.id === id)) links.push({ id, label: s.title ?? id, url: s.url }); };
  if (/quench/.test(text)) add(f.quench.source);
  if (/FM2/.test(text)) add(f.fm2.id);
  return { intent, text, citations: [...psi], links, followUps: followUpsFor(f, intent) };
}
