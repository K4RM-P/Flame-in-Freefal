// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Simulation assistant: answers one engineer question about the CURRENT run, grounded only on the posted
// scenario inputs, engine result, ranked PSI evidence, sensitivity, next-test and Saffire replay metrics.
// Every number must be in the facts (guard.ts); PSI ids must be in the evidence list; engine citations
// [S:path] must resolve to a path in the facts. One regeneration, then unsupported sentences are stripped.
import { z } from "zod";
import type OpenAI from "openai";
import { guard, numbersIn, supported, collectNumbers } from "./guard";
import { InterpretRequestSchema, buildFacts } from "./interpret";
import { model } from "./client";

const ResultLite = z.object({
  outcome: z.record(z.unknown()),
  events: z.array(z.record(z.unknown())).max(200).default([]),
  warnings: z.array(z.string()).max(50).default([]),
}).passthrough();

export const AskRequestSchema = InterpretRequestSchema.extend({
  question: z.string().trim().min(3).max(500),
  replay: z.record(z.unknown()).nullable().optional(),
  compare: z.object({ scenario: z.record(z.unknown()), result: ResultLite }).optional(),
});
export type AskRequest = z.infer<typeof AskRequestSchema>;

export function askFacts(r: AskRequest) {
  const base = buildFacts(r);
  const cmp = r.compare ? (({ outcome, events, warnings }) => ({ scenario: r.compare!.scenario, outcome, events, warnings }))(r.compare.result as Record<string, unknown>) : undefined;
  return { ...base, replay_vs_telemetry: r.replay ?? undefined, compare_B: cmp };
}
export type AskFacts = ReturnType<typeof askFacts>;

const PSI_ID = /PSI-\d+/g;
const FACT_REF = /\[S:([^\]]+)\]/g;

/** Resolve "outcome.metrics[2].value" or "outcome.metrics.2.value" inside the facts object. */
export function resolvePath(obj: unknown, path: string): boolean {
  const parts = path.trim().replace(/\[(\d+)\]/g, ".$1").split(".").filter(Boolean);
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== "object") return false;
    if (!(p in (cur as Record<string, unknown>))) return false;
    cur = (cur as Record<string, unknown>)[p];
  }
  return parts.length > 0 && cur !== undefined;
}

export function factRefs(text: string) { return [...new Set([...text.matchAll(FACT_REF)].map((m) => m[1].trim()))]; }

export function checkAsk(text: string, facts: AskFacts, question: string) {
  const g = guard(text, [facts], question);
  const allowed = new Set(facts.evidence.map((e) => e.accession));
  const ids = [...new Set(text.replace(FACT_REF, " ").match(PSI_ID) ?? [])];
  const refs = factRefs(text);
  const badRefs = refs.filter((p) => !resolvePath(facts, p));
  const unknownIds = ids.filter((i) => !allowed.has(i));
  return { ok: g.ok && unknownIds.length === 0 && badRefs.length === 0, unsupported: g.unsupported, unknown_ids: unknownIds, bad_refs: badRefs,
    citations: ids.filter((i) => allowed.has(i)), facts: refs.filter((p) => resolvePath(facts, p)) };
}

/** Keep only sentences whose numbers, PSI ids and [S:path] references are all supported. */
export function stripAsk(text: string, facts: AskFacts, question: string): string {
  const pool = collectNumbers([facts]), allowedNums = numbersIn(question);
  const allowed = new Set(facts.evidence.map((e) => e.accession));
  let removed = false;
  const kept = text.split(/(?<=[.!?])\s+(?=[A-Z[(*-])/).filter((s) => {
    const bad = numbersIn(s).some((x) => !supported(x, pool, allowedNums))
      || (s.replace(FACT_REF, " ").match(PSI_ID) ?? []).some((i) => !allowed.has(i))
      || factRefs(s).some((p) => !resolvePath(facts, p));
    if (bad) removed = true;
    return !bad;
  }).join(" ").trim();
  return (kept || "No answer could be supported by this run's data.") + (removed ? " (removed unsupported claim)" : "");
}

export const ASK_INSTRUCTIONS = [
  "You are the EmberAtlas simulation assistant for a spacecraft or habitat fire-safety engineer.",
  "Answer the question about the CURRENT simulation run in at most 6 plain sentences, no headings.",
  "Use ONLY the JSON facts: scenario inputs (SI units), engine outcome, events, warnings, calibration flags, ranked PSI evidence,",
  "sensitivity rows (if present), next_test (if present), replay_vs_telemetry (if present) and compare_B (if present).",
  "Copy numbers exactly as they appear in the facts with their units; never compute, convert, estimate or round to new numbers.",
  "After each claim cite its source: engine/scenario facts as [S:<dot path into the facts JSON>] (e.g. [S:outcome.metrics.0.value], [S:events.1.detail], [S:scenario.cabin.flow_m_s]);",
  "PSI evidence by its accession (e.g. PSI-99), only accessions from the evidence list.",
  "If the facts do not contain what is needed, say 'No data' for that part and name the missing input (e.g. the detector threshold) instead of guessing.",
  "For mitigation questions, only discuss inputs that exist in the scenario (detector type, distance, threshold, fan_off_on_alarm, suppression agent, mass, delay, flow, O2, pressure, materials);",
  "state that the size of any effect is unknown unless the sensitivity or compare_B facts show it, and recommend re-running the simulator to check.",
  "Never call partial-gravity results measured: they are bounded estimates between microgravity and 1 g. If a sub-model is uncalibrated (theory-only), say so plainly. Do not soften failures.",
].join("\n");

export interface AskResponse { text: string; citations: string[]; facts: string[]; model: string; guard: { ok: boolean; regenerated: boolean; stripped: boolean; unsupported: number[]; unknown_ids: string[]; bad_refs: string[] } }

export async function ask(client: OpenAI, req: AskRequest): Promise<AskResponse> {
  const facts = askFacts(req);
  const input = `Question: ${req.question}\n\nFacts (JSON):\n${JSON.stringify(facts)}`;
  const call = async (extra = "") => {
    const r = await client.responses.create({ model: model(), store: false, instructions: ASK_INSTRUCTIONS + extra, input, max_output_tokens: 700 });
    const t = r.output_text?.trim();
    if (!t) throw new Error("model returned no answer");
    return t;
  };
  let text = await call();
  let chk = checkAsk(text, facts, req.question);
  let regenerated = false, stripped = false;
  if (!chk.ok) {
    regenerated = true;
    text = await call(`\nYour previous answer used numbers not in the facts (${chk.unsupported.join(", ") || "none"}), PSI ids not in the evidence (${chk.unknown_ids.join(", ") || "none"}) or [S:] paths that do not exist (${chk.bad_refs.join(", ") || "none"}). Remove or fix them.`);
    chk = checkAsk(text, facts, req.question);
    if (!chk.ok) {
      const first = chk;
      text = stripAsk(text, facts, req.question); stripped = true;
      chk = { ...checkAsk(text, facts, req.question), unsupported: first.unsupported, unknown_ids: first.unknown_ids, bad_refs: first.bad_refs };
    }
  }
  return { text, citations: chk.citations, facts: chk.facts, model: model(),
    guard: { ok: !stripped, regenerated, stripped, unsupported: chk.unsupported, unknown_ids: chk.unknown_ids, bad_refs: chk.bad_refs } };
}
