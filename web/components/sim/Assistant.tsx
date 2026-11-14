"use client";
// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Simulation assistant: questions about the CURRENT run, answered by /api/ask from engine output, scenario inputs,
// ranked PSI evidence, sensitivity, next-test and replay metrics only. Citations render beside each answer.
// No key / failure → the error is shown as-is; there is no canned or fallback answer.
import { useRef, useState } from "react";
import { nextTest } from "@/lib/sim/nextTest";
import { replayError } from "@/lib/sim/replay";
import { compact, evidenceForAI } from "./RunPanel";
import { TELEMETRY, psiUrl } from "./data";
import { useSim, type ChatMsg } from "./store";

const QUICK = ["Why did the fire continue?", "What caused the alarm?", "Which variable matters most?", "What mitigation would reduce risk?", "What should we test next?"];

export async function askAssistant(question: string) {
  const { a, b, ra, rb, sens, replay, chat, set } = useSim.getState();
  if (!a || !ra) return;
  const q = question.trim();
  if (q.length < 3) return;
  set({ chat: [...chat, { role: "user", text: q }], asking: true });
  const push = (m: ChatMsg) => set({ chat: [...useSim.getState().chat, m], asking: false });
  try {
    const nt = nextTest(a, ra);
    const body = {
      question: q, scenario: a, result: compact(ra), evidence: evidenceForAI(a),
      ...(sens && sens.scenario === a ? { sensitivity: (sens.rows as Record<string, unknown>[]).slice(0, 20).map((r) => ({ ...r, outcome: sens.key })) } : {}),
      ...(nt ? { next_test: nt as unknown as Record<string, unknown> } : {}),
      ...(replay && TELEMETRY ? { replay: (replayError(ra, TELEMETRY) ?? null) as Record<string, unknown> | null } : {}),
      ...(b && rb ? { compare: { scenario: b, result: compact(rb) } } : {}),
    };
    const res = await fetch("/api/ask", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) push({ role: "assistant", text: j.error ?? `Assistant unavailable (${res.status})`, error: true });
    else push({ role: "assistant", text: j.text, citations: j.citations ?? [], facts: j.facts ?? [], stripped: !!j.guard?.stripped });
  } catch (e) { push({ role: "assistant", text: `Assistant request failed: ${String(e)}`, error: true }); }
}

/** Render [S:path] engine citations as compact markers in the answer text. */
function AnswerText({ text }: { text: string }) {
  const parts = text.split(/(\[S:[^\]]+\])/g);
  return <p className="whitespace-pre-line text-[13px] leading-relaxed">{parts.map((p, i) => {
    const m = p.match(/^\[S:([^\]]+)\]$/);
    return m ? <sup key={i} className="num ml-0.5 text-[10px] text-blue" title={`engine/scenario fact: ${m[1]}`}>[{m[1].split(".").slice(-2).join(".")}]</sup> : <span key={i}>{p}</span>;
  })}</p>;
}

export function Assistant() {
  const { ra, chat, asking } = useSim();
  const [q, setQ] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const send = async (text: string) => { setQ(""); await askAssistant(text); end.current?.scrollIntoView({ block: "end" }); };
  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="assistant">
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1" aria-live="polite">
        {!ra && <p className="text-[13px] text-mute">Run the simulation first. The assistant answers only from the current run: engine output, scenario inputs, ranked PSI evidence, sensitivity, next-test and replay metrics.</p>}
        {chat.map((m, i) => m.role === "user"
          ? <p key={i} className="ml-6 border border-line bg-surface2 px-2 py-1 text-[13px]" style={{ borderRadius: 6 }}>{m.text}</p>
          : <div key={i} className={`grid gap-2 ${m.error ? "" : "grid-cols-[minmax(0,1fr)_104px]"}`} data-testid="assistant-answer">
              {m.error ? <p className="text-[13px] text-warn" role="status">{m.text}</p> : <AnswerText text={m.text} />}
              {!m.error && <aside className="space-y-1 border-l border-line pl-2 text-[11px]" aria-label="Citations">
                <p className="label text-[10px]">Cites</p>
                {(m.citations ?? []).map((c) => <a key={c} className="num block underline underline-offset-2" href={psiUrl(c)} target="_blank" rel="noreferrer">{c}</a>)}
                {(m.facts ?? []).map((p) => <span key={p} className="num block truncate text-blue" title={p}>{p}</span>)}
                {!m.citations?.length && !m.facts?.length && <span className="text-faint">∅ none</span>}
                {m.stripped && <span className="block text-warn">unsupported claim removed</span>}
              </aside>}
            </div>)}
        {asking && <p className="text-[13px] text-mute">Checking the answer against this run's facts…</p>}
        <div ref={end} />
      </div>
      <div className="space-y-2 border-t border-line pt-2">
        <div className="flex flex-wrap gap-1">
          {QUICK.map((x) => <button key={x} type="button" className="btn px-2 py-0.5 text-[12px]" disabled={!ra || asking} onClick={() => send(x)}>{x}</button>)}
        </div>
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void send(q); }}>
          <input type="text" className="min-w-0 flex-1" placeholder={ra ? "Ask about this run…" : "Run first"} value={q} onChange={(e) => setQ(e.target.value)} disabled={!ra || asking} aria-label="Ask the simulation assistant" maxLength={500} />
          <button type="submit" className="btn" disabled={!ra || asking || q.trim().length < 3}>Ask</button>
        </form>
        <p className="text-[11px] text-faint">AI-generated. Numbers are checked against this run; citations are engine facts [S:…] or ranked PSI records.</p>
      </div>
    </div>
  );
}
