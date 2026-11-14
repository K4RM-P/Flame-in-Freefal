// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
import { z } from "zod";
import { NO_KEY_MESSAGE, openaiClient, model } from "@/lib/ai/client";
import { gate, json, readJson } from "@/lib/ai/http";
import { rankEvidence } from "@/lib/sim/evidence";
import { ScenarioSchema } from "@/lib/sim/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const Body = z.object({ scenario: ScenarioSchema, question: z.string().trim().max(800).optional() });

export async function POST(req: Request) {
  const limited = gate(req); if (limited) return limited;
  const raw = await readJson(req, 40_000); if ("error" in raw) return raw.error;
  const parsed = Body.safeParse(raw.body); if (!parsed.success) return json({ error: "A complete scenario is required before matching." }, 400);
  const matches = rankEvidence(parsed.data.scenario).slice(0, 12);
  const client = openaiClient();
  if (!client) return json({ matches, ai: null, notice: `${NO_KEY_MESSAGE}. Deterministic NASA matching is still available.` });
  const facts = { question: parsed.data.question ?? "Explain the closest NASA evidence for this design.", scenario: parsed.data.scenario, matches };
  try {
    const answer = await client.responses.create({
      model: model(), store: false,
      instructions: "You are the EmberAtlas experiment-matching analyst. Explain how closely this design resembles NASA PSI experiments in the supplied JSON. Use only supplied facts. Never invent a value, NASA result, experiment detail, or confidence. Refer to PSI accessions only from matches. Distinguish exact/close condition matches from evidence that is merely related. Explain the largest mismatches and what the comparison cannot establish. Answer in 4–6 concise sentences.",
      input: `Facts (JSON):\n${JSON.stringify(facts)}`, max_output_tokens: 600,
    });
    return json({ matches, ai: answer.output_text?.trim() || null });
  } catch (e) {
    const err = e as { status?: number; code?: string };
    console.error("experiment match AI failed:", err?.status, err?.code);
    return json({ matches, ai: null, notice: `AI matching explanation failed${err?.status ? ` (${err.status})` : ""}; the sourced match list is still available.` });
  }
}
