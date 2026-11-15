// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// POST {scenario, result, evidence[], question?, brief?, stream?}.
//   stream=false → {text, citations[], guard, model} (503 without a key, as before).
//   stream=true  → SSE (lib/ai/stream.ts): real pipeline steps, answer tokens, then guard + citations.
//                  Without a key (or if OpenAI fails) it streams the deterministic engine summary (offline: true).
// Grounded only on the posted engine output and PSI evidence; numeric + citation guard in lib/ai/interpret.ts.
import { NO_KEY_MESSAGE, model, openaiClient } from "@/lib/ai/client";
import { gate, json, readJson } from "@/lib/ai/http";
import { BRIEF_INSTRUCTIONS, INSTRUCTIONS, InterpretRequestSchema, buildFacts, checkAnswer, citationCheck, interpret, stripAnswer } from "@/lib/ai/interpret";
import { numbersIn } from "@/lib/ai/guard";
import { localInterpret } from "@/lib/ai/localInterpret";
import { sseResponse, step } from "@/lib/ai/stream";
import { simulate } from "@/lib/sim/engine";
import { ScenarioSchema } from "@/lib/sim/types";

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
  if (p.data.stream) return streamed(p.data, client);
  if (!client) return json({ error: NO_KEY_MESSAGE }, 503);
  try {
    return json(await interpret(client, p.data));
  } catch (e) {
    const err = e as { status?: number; code?: string; message?: string };
    console.error("interpretation failed:", err?.status, err?.code, err?.message ?? e);
    return json({ error: `OpenAI interpretation failed${err?.status ? ` (${err.status})` : ""}${err?.code ? `: ${err.code}` : ""}. Check the Vercel key and OPENAI_MODEL setting.` }, 502);
  }
}

function streamed(data: Parameters<typeof buildFacts>[0], client: ReturnType<typeof openaiClient>) {
  return sseResponse(async (emit) => {
    const n = data.evidence.length;
    await step(emit, "evidence", `Reading ${n} NASA experiment${n === 1 ? "" : "s"}…`, () => n, () => `Read ${n} NASA experiment${n === 1 ? "" : "s"}`);
    const sc = ScenarioSchema.safeParse(data.scenario);
    const run = sc.success ? await step(emit, "sim", "Running the simulation…", () => { try { return simulate(sc.data); } catch { return null; } }, (v) => (v ? "Re-ran the engine on this scenario" : "Engine refused this scenario")) : null;
    const facts = await step(emit, "review", "Ranking design fixes…", () => buildFacts(data), (f) => `Ranked ${f.design_review?.length ?? 0} design fixes`);
    let text = "", offline = !client;
    if (client) {
      try {
        await step(emit, "model", data.brief ? "Writing the briefing…" : "Writing the answer…", async () => {
          const s = await client.responses.create({ model: model(), store: false, instructions: data.brief ? BRIEF_INSTRUCTIONS : INSTRUCTIONS, input: "Facts (JSON):\n" + JSON.stringify(facts), max_output_tokens: 700, stream: true });
          for await (const ev of s) if (ev.type === "response.output_text.delta") { text += ev.delta; emit({ type: "token", text: ev.delta }); }
        });
      } catch (e) { console.error("interpret stream failed; offline summary:", (e as Error)?.message); offline = true; if (text) emit({ type: "replace", text: "" }); text = ""; }
    }
    if (offline) {
      if (!run || !sc.success) { emit({ type: "error", error: "No engine result to summarise." }); return; }
      text = await step(emit, "model", "Writing the offline summary from engine numbers…", () => localInterpret(sc.data, run));
      emit({ type: "token", text });
    }
    const k = numbersIn(text).length;
    const chk = await step(emit, "guard", `Checking ${k} number${k === 1 ? "" : "s"} against the engine…`, () => checkAnswer(text, facts), (c) => (c.ok ? `${k} numbers checked` : `Removed ${c.unsupported.length + c.unknown_ids.length} unsupported claim(s)`));
    let stripped = false;
    if (!chk.ok) { text = stripAnswer(text, facts); stripped = true; emit({ type: "replace", text }); }
    const citations = citationCheck(text, facts.evidence).citations;
    if (citations.length) await step(emit, "cite", `Citing ${citations.join(", ")}…`, () => citations, () => `Cited ${citations.join(", ")}`);
    emit({ type: "done", data: { text, citations, offline, model: offline ? "local" : model(), guard: { ok: !stripped, unsupported: chk.unsupported, unknown_ids: chk.unknown_ids, stripped } } });
  });
}
