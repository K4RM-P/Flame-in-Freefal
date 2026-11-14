// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// POST {question, scenario, result, evidence[], sensitivity?, next_test?, replay?, compare?} → {text, citations[], facts[], guard, model}.
// Grounded only on the posted run; numeric, citation and fact-path guard in lib/ai/ask.ts. No key → 503, never a canned answer.
import { NO_KEY_MESSAGE, openaiClient } from "@/lib/ai/client";
import { gate, json, readJson } from "@/lib/ai/http";
import { AskRequestSchema, ask } from "@/lib/ai/ask";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const limited = gate(req);
  if (limited) return limited;
  const r = await readJson(req, 500_000);
  if ("error" in r) return r.error;
  const p = AskRequestSchema.safeParse(r.body);
  if (!p.success) return json({ error: "invalid request", issues: p.error.issues.slice(0, 5).map((i) => `${i.path.join(".")}: ${i.message}`) }, 400);
  const client = openaiClient();
  if (!client) return json({ error: `${NO_KEY_MESSAGE}. The simulator, receipts and evidence keep working without it.` }, 503);
  try {
    return json(await ask(client, p.data));
  } catch (e) {
    const err = e as { status?: number; code?: string; message?: string };
    console.error("assistant failed:", err?.status, err?.code, err?.message ?? e);
    return json({ error: `OpenAI request failed${err?.status ? ` (${err.status})` : ""}${err?.code ? `: ${err.code}` : ""}. Check OPENAI_API_KEY and OPENAI_MODEL; the simulator keeps working.` }, 502);
  }
}
