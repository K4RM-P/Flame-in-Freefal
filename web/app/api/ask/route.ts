// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
import fs from "node:fs";
import path from "node:path";
import { askAgent, type TraceItem } from "@/lib/ai/agent";
import { matchGolden } from "@/lib/ai/golden";
import cache from "@/data/cache/golden.json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const hits = new Map<string, { n: number; t: number }>();
function limited(ip: string): boolean {
  const now = Date.now(), h = hits.get(ip);
  if (!h || now - h.t > 60_000) { hits.set(ip, { n: 1, t: now }); return false; }
  h.n += 1;
  return h.n > 8;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CACHE = cache as any[];
function cached(q: string) {
  const g = matchGolden(q);
  return g ? CACHE.find((c) => c.id === g.id) : undefined;
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
  if (limited(ip)) return new Response(JSON.stringify({ type: "error", message: "rate limited; try again in a minute" }) + "\n", { status: 429 });
  const { question } = (await req.json()) as { question?: string };
  if (!question || question.length > 800) return new Response(JSON.stringify({ type: "error", message: "question required (≤ 800 chars)" }) + "\n", { status: 400 });
  const demo = process.env.DEMO_MODE === "1" || !process.env.ANTHROPIC_API_KEY;
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(ctl) {
      const send = (o: unknown) => ctl.enqueue(enc.encode(JSON.stringify(o) + "\n"));
      const serveCache = (why: string) => {
        const c = cached(question);
        if (c) { for (const t of c.trace) send({ type: "trace", ...t }); send({ type: "answer", answer: c.answer, mode: c.mode, guard: c.guard, note: why }); }
        else send({ type: "answer", answer: `Demo mode (${why}): live AI is unavailable, and only the 12 golden questions are cached. Pick one from the list, or run the models directly in the console.`, mode: "offline-demo", guard: { ok: true, unsupported: [] } });
      };
      try {
        if (demo) serveCache(process.env.DEMO_MODE === "1" ? "DEMO_MODE=1" : "no API key");
        else {
          const system = fs.readFileSync(path.join(process.cwd(), "lib/ai/system.md"), "utf8");
          const r = await askAgent(question, system, (t: TraceItem) => send({ type: "trace", ...t }));
          send({ type: "answer", answer: r.answer, mode: r.mode, guard: r.guard });
        }
      } catch (e) {
        serveCache(`API error: ${String(e).slice(0, 120)}`);
      }
      ctl.close();
    },
  });
  return new Response(stream, { headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" } });
}
