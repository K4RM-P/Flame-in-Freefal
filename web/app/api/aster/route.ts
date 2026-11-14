// SI-assisted: written with Codex (OpenAI); see README "Use of AI (SI)".
import { z } from "zod";
import { gate, json, readJson } from "@/lib/ai/http";
import { answerLocally } from "@/lib/ai/localAster";

export const runtime = "nodejs";

const requestSchema = z.object({ question: z.string().trim().min(1).max(800) });

export async function POST(request: Request) {
  const limited = gate(request);
  if (limited) return limited;

  const payload = await readJson(request, 8192);
  if ("error" in payload) return payload.error;
  const input = requestSchema.safeParse(payload.body);
  if (!input.success) return json({ error: "Enter a question of up to 800 characters." }, 400);

  return json(answerLocally(input.data.question));
}
