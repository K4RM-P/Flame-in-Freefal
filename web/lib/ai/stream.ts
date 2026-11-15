// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// One streaming protocol for every AI route (Server-Sent Events over a ReadableStream).
// Events: step (a real pipeline step starting/finishing), token (answer text), replace (guard rewrote the answer),
// done (final payload) and error. The thinking trail only ever shows steps that were actually emitted.
export type StepStatus = "active" | "done";
export type AiEvent =
  | { type: "step"; id: string; label: string; status: StepStatus }
  | { type: "token"; text: string }
  | { type: "replace"; text: string }
  | { type: "done"; data: Record<string, unknown> }
  | { type: "error"; error: string };
export type Emit = (e: AiEvent) => void;

/** Server: run `work` and stream every event it emits. */
export function sseResponse(work: (emit: Emit) => Promise<void>): Response {
  const enc = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(ctrl) {
      const emit: Emit = (e) => ctrl.enqueue(enc.encode(`data: ${JSON.stringify(e)}\n\n`));
      try { await work(emit); } catch (e) { emit({ type: "error", error: String((e as Error)?.message ?? e) }); }
      ctrl.close();
    },
  });
  return new Response(body, { headers: { "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-store", "x-accel-buffering": "no" } });
}

/** Wraps a step: emits active, runs, emits done (the label may be updated with what was found). */
export async function step<T>(emit: Emit, id: string, label: string, fn: () => Promise<T> | T, doneLabel?: (v: T) => string): Promise<T> {
  emit({ type: "step", id, label, status: "active" });
  const v = await fn();
  emit({ type: "step", id, label: doneLabel ? doneLabel(v) : label, status: "done" });
  return v;
}

/** Client: parse an SSE response into events. Falls back to a plain JSON body (older routes, errors). */
export async function readEvents(res: Response, on: (e: AiEvent) => void): Promise<void> {
  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("text/event-stream") || !res.body) {
    const j = await res.json().catch(() => ({}));
    on(res.ok ? { type: "done", data: j } : { type: "error", error: j.error ?? `HTTP ${res.status}` });
    return;
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i: number;
    while ((i = buf.indexOf("\n\n")) >= 0) {
      const chunk = buf.slice(0, i); buf = buf.slice(i + 2);
      const line = chunk.split("\n").find((l) => l.startsWith("data: "));
      if (line) { try { on(JSON.parse(line.slice(6)) as AiEvent); } catch { /* ignore a malformed frame */ } }
    }
  }
}

/** Client state reducer shared by the drawer and Aster. */
export interface Trail { id: string; label: string; status: StepStatus }
export interface AiRun { steps: Trail[]; text: string; chunks: string[]; done: Record<string, unknown> | null; error: string | null; streaming: boolean }
export const emptyRun = (): AiRun => ({ steps: [], text: "", chunks: [], done: null, error: null, streaming: true });
export function reduceRun(s: AiRun, e: AiEvent): AiRun {
  switch (e.type) {
    case "step": {
      const i = s.steps.findIndex((x) => x.id === e.id);
      const steps = i < 0 ? [...s.steps, { id: e.id, label: e.label, status: e.status }] : s.steps.map((x, k) => (k === i ? { ...x, label: e.label, status: e.status } : x));
      return { ...s, steps };
    }
    case "token": return { ...s, text: s.text + e.text, chunks: [...s.chunks, e.text] };
    case "replace": return { ...s, text: e.text, chunks: e.text ? [e.text] : [] };
    case "done": return { ...s, done: e.data, streaming: false, text: typeof e.data.text === "string" && !s.text ? e.data.text : s.text };
    case "error": return { ...s, error: e.error, streaming: false };
  }
}
