// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// POST {text} → {scenario, valid, missing[], notes[], rejected[]}. Fills fields for review only; nothing runs here.
import { z } from "zod";
import { NO_KEY_MESSAGE, openaiClient } from "@/lib/ai/client";
import { gate, json, readJson } from "@/lib/ai/http";
import { buildScenario } from "@/lib/ai/scenario";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({ text: z.string().trim().min(3).max(2000) });

export async function POST(req: Request) {
  const limited = gate(req);
  if (limited) return limited;
  const r = await readJson(req, 8_000);
  if ("error" in r) return r.error;
  const p = Body.safeParse(r.body);
  if (!p.success) return json({ error: "text required (3–2000 characters)" }, 400);
  const client = openaiClient();
  if (!client) return json({ error: NO_KEY_MESSAGE.replace("interpretation", "the scenario builder") }, 503);
  try {
    return json(await buildScenario(client, p.data.text));
  } catch (e) {
    console.error("scenario builder failed:", e instanceof Error ? e.message : e);
    return json({ error: "AI scenario builder unavailable (OpenAI request failed); fill the fields by hand." }, 502);
  }
}
