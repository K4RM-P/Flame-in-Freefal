// SI-assisted: written with Codex (OpenAI); see README "Use of AI (SI)".
import { askOpenAI } from "../lib/ai/openai";
import system from "../lib/ai/system.md";

interface Env {
  OPENAI_API_KEY?: string;
  ASTER_LIMIT?: { limit(input: { key: string }): Promise<{ success: boolean }> };
}

const origin = "https://k4rm-p.github.io";
const cors = { "Access-Control-Allow-Origin": origin, Vary: "Origin" };

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const json = (body: unknown, status: number) => Response.json(body, { status, headers: cors });
    if (new URL(request.url).pathname !== "/api/ask") return new Response("Aster Worker", { status: 404 });
    if (request.headers.get("Origin") !== origin) return json({ error: "Origin not allowed" }, 403);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: {
      ...cors, "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type",
    } });
    if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
    if (!env.OPENAI_API_KEY || !env.ASTER_LIMIT) return json({ error: "Worker setup incomplete" }, 503);
    let question: unknown;
    try { ({ question } = await request.json() as { question?: unknown }); }
    catch { return json({ error: "Invalid request" }, 400); }
    if (typeof question !== "string" || !question.trim() || question.length > 800) return json({ error: "Invalid question" }, 400);
    const { success } = await env.ASTER_LIMIT.limit({ key: "aster-demo" });
    if (!success) return json({ error: "Aster is busy. Try again in a minute." }, 429);
    try {
      const result = await askOpenAI(question.trim(), system, () => {}, env.OPENAI_API_KEY);
      if (!result.guard.ok) return json({ error: "The answer did not pass its numeric check" }, 502);
      const lines = [...result.trace.map(trace => ({ type: "trace", ...trace })), { type: "answer", ...result, trace: undefined }];
      return new Response(lines.map(line => JSON.stringify(line)).join("\n") + "\n", {
        headers: { ...cors, "Content-Type": "application/x-ndjson", "Cache-Control": "no-store" },
      });
    } catch {
      return json({ error: "Live Aster unavailable" }, 502);
    }
  },
};
