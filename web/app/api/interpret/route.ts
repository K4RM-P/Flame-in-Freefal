// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// POST {scenario, result, evidence[], sensitivity?, next_test?} → {text, citations[], guard, model}.
// Grounded only on the posted engine output and PSI evidence; numeric + citation guard in lib/ai/interpret.ts.
import { NO_KEY_MESSAGE, openaiClient } from "@/lib/ai/client";
import { gate, json, readJson } from "@/lib/ai/http";
import { InterpretRequestSchema, interpret } from "@/lib/ai/interpret";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const limited = gate(req);
  if (limited) return limited;
  const r = await readJson(req, 400_000);
  if ("error" in r) return r.error;
  const p = InterpretRequestSchema.safeParse(r.body);
  if (!p.success) return json({ error: "invalid request", issues: p.error.issues.slice(0, 5).map((i) => `${i.path.join(".")}: ${i.message}`) }, 400);
  const client = openaiClient();
  if (!client) return json({ error: NO_KEY_MESSAGE }, 503);
  try {
    return json(await interpret(client, p.data));
  } catch (e) {
    const err = e as { status?: number; code?: string; message?: string };
    console.error("interpretation failed:", err?.status, err?.code, err?.message ?? e);
    return json({ error: `OpenAI interpretation failed${err?.status ? ` (${err.status})` : ""}${err?.code ? `: ${err.code}` : ""}. Check the Vercel key and OPENAI_MODEL setting.` }, 502);
  }
}
