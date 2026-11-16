// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Run interpretation grounded only on the engine output and the ranked PSI evidence sent by the client.
// Numbers are checked by guard.ts; PSI accessions must be in the evidence list. One regeneration, then strip.
import { z } from "zod";
import type OpenAI from "openai";
import { guard, stripUnsupported } from "./guard";
import { model } from "./client";
import { designReview } from "@/lib/sim/designReview";
import { simulate } from "@/lib/sim/engine";
import { ScenarioSchema } from "@/lib/sim/types";

export const EvidenceSchema = z.object({
  accession: z.string().regex(/^PSI-\d+$/), title: z.string().max(300),
  summary: z.string().max(600).optional(), role: z.string().max(40).optional(), doi: z.string().max(200).optional(),
  match: z.number().optional(),
}).passthrough();
export const InterpretRequestSchema = z.object({
  scenario: z.record(z.unknown()),
  question: z.string().max(800).optional(),
  result: z.object({
    outcome: z.record(z.unknown()),
    events: z.array(z.record(z.unknown())).max(200).default([]),
    warnings: z.array(z.string()).max(50).default([]),
  }).passthrough(),
  evidence: z.array(EvidenceSchema).max(30),
  sensitivity: z.array(z.record(z.unknown())).max(20).optional(),
  next_test: z.record(z.unknown()).optional(),
  design_review: z.array(z.record(z.unknown())).max(20).optional(),
  stream: z.boolean().optional(),
  brief: z.boolean().optional(),
  /** Scenario B when the simulator shows an A/B compare (the offline explainer re-runs it server-side). */
  compare: z.object({ scenario: z.record(z.unknown()) }).passthrough().optional(),
});
export type InterpretRequest = z.infer<typeof InterpretRequestSchema>;

/** Ranked fixes recomputed deterministically from the posted scenario (engine numbers, not client numbers). */
export function reviewFor(scenario: unknown) {
  const p = ScenarioSchema.safeParse(scenario);
  if (!p.success) return null;
  try { return designReview(p.data, simulate(p.data)).slice(0, 5).map((f, i) => ({ rank: i + 1, ...f })); } catch { return null; }
}

/** The only material the model sees, and the pool the guard checks against. Time series are dropped. */
export function buildFacts(r: InterpretRequest) {
  const { outcome, events, warnings, provenance } = r.result as Record<string, unknown>;
  const review = reviewFor(r.scenario) ?? r.design_review ?? null;
  return {
    scenario: r.scenario, question: r.question, outcome, events, warnings,
    calibration: (provenance as { params?: unknown } | undefined)?.params,
    evidence: r.evidence.map(({ accession, title, summary, role, doi }) => ({ accession, title, summary, role, doi })),
    sensitivity: r.sensitivity, next_test: r.next_test,
    design_review: review,
  };
}

const PSI_ID = /PSI-\d+/g;
export function citationCheck(text: string, evidence: { accession: string }[]) {
  const allowed = new Set(evidence.map((e) => e.accession));
  const cited = [...new Set(text.match(PSI_ID) ?? [])];
  return { citations: cited.filter((c) => allowed.has(c)), unknown: cited.filter((c) => !allowed.has(c)) };
}

export function checkAnswer(text: string, facts: ReturnType<typeof buildFacts>) {
  const g = guard(text, [facts]);
  const c = citationCheck(text, facts.evidence);
  return { ok: g.ok && c.unknown.length === 0, unsupported: g.unsupported, unknown_ids: c.unknown, citations: c.citations };
}

/** Drop sentences with unsupported numbers or uncited PSI ids. */
export function stripAnswer(text: string, facts: ReturnType<typeof buildFacts>): string {
  const allowed = new Set(facts.evidence.map((e) => e.accession));
  let removed = false;
  const kept = text.split(/(?<=[.!?])\s+(?=[A-Z[(*-])/).filter((s) => {
    const bad = (s.match(PSI_ID) ?? []).some((id) => !allowed.has(id));
    if (bad) removed = true;
    return !bad;
  }).join(" ");
  const out = stripUnsupported(kept, [facts]);
  return removed && !out.endsWith("(removed unsupported claim)") ? out + " (removed unsupported claim)" : out;
}

export const INSTRUCTIONS = [
  "You interpret one run of the EmberAtlas cabin fire simulator for a spacecraft or habitat engineer.",
  "Write 4 to 6 plain sentences, no lists or headings:",
  "1) what drove the outcome; 2) how these conditions differ from the ISS conditions in the PSI evidence;",
  "3) the single design change with the biggest effect: it MUST be fix #1 of design_review (rank 1), stated with its before → after numbers; if that fix has basis \"theory-only\", say it is theory-only.",
  "Use ONLY numbers that appear in the JSON facts, copied with their units; do not compute new numbers.",
  "Cite PSI accessions (e.g. PSI-99) only from the evidence list. Never call partial-gravity results measured: they are estimates between microgravity and 1 g, and NASA's FM2 lunar-gravity tests show some materials burn more readily at lunar g than at either, so the estimate may be non-conservative.",
  "Any CO or smoke number is theory-only (uncalibrated sub-model): say so whenever you use one.",
  "If a sub-model is marked uncalibrated or a warning says theory-only, say so plainly. Do not soften failures.",
  "If a user question is included, answer that question directly while staying within the supplied facts and cite every PSI accession you use.",
].join("\n");

/** The auto-briefing after a run: exactly three sentences. */
export const BRIEF_INSTRUCTIONS = [
  "You brief a spacecraft fire engineer on one run of the EmberAtlas cabin fire simulator.",
  "Write exactly 3 plain sentences: 1) what happened (ignition, alarm, agent, how the fire ended); 2) why (the driver, citing the closest PSI accession from the evidence); 3) how sure we are (calibrated vs theory-only sub-models, inside or outside the PSI envelope, partial gravity is an estimate that may be non-conservative per NASA FM2).",
  "Use ONLY numbers that appear in the JSON facts, copied with their units; do not compute new numbers. Cite PSI accessions only from the evidence list. Do not soften failures.",
].join("\n");

export interface InterpretResponse { text: string; citations: string[]; guard: { ok: boolean; unsupported: number[]; unknown_ids: string[]; regenerated: boolean; stripped: boolean }; model: string }

export async function interpret(client: OpenAI, req: InterpretRequest): Promise<InterpretResponse> {
  const facts = buildFacts(req);
  const input = "Facts (JSON):\n" + JSON.stringify(facts);
  const ask = async (extra = "") => {
    const r = await client.responses.create({ model: model(), store: false, instructions: INSTRUCTIONS + extra, input, max_output_tokens: 700 });
    const t = r.output_text?.trim();
    if (!t) throw new Error("model returned no interpretation");
    return t;
  };
  let text = await ask();
  let chk = checkAnswer(text, facts);
  let regenerated = false, stripped = false;
  if (!chk.ok) {
    regenerated = true;
    text = await ask(`\nYour previous answer used numbers not in the facts (${chk.unsupported.join(", ") || "none"}) or PSI ids not in the evidence (${chk.unknown_ids.join(", ") || "none"}). Remove them.`);
    chk = checkAnswer(text, facts);
    if (!chk.ok) { text = stripAnswer(text, facts); stripped = true; chk = { ...checkAnswer(text, facts), unsupported: chk.unsupported, unknown_ids: chk.unknown_ids }; }
  }
  return { text, citations: citationCheck(text, facts.evidence).citations, model: model(),
    guard: { ok: !stripped, unsupported: chk.unsupported, unknown_ids: chk.unknown_ids, regenerated, stripped } };
}
