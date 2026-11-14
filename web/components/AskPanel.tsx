"use client";
// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { GOLDEN_QUESTIONS, ROLE_QUESTIONS } from "@/lib/ai/questions";
import { source } from "@/lib/sources";
import { useMission } from "@/lib/store";
import { CopyButton } from "@/components/ui-kit";

interface Trace { name: string; input: Record<string, unknown>; output: Record<string, unknown>; ms?: number }
const short = (o: unknown) => (typeof o === "number" ? Number(o.toPrecision(3)) : o);

function traceLine(t: Trace): string {
  const args = Object.entries(t.input ?? {}).map(([k, v]) => `${k}=${typeof v === "object" ? JSON.stringify(v) : short(v)}`).join(", ");
  const o = t.output as { value?: number; units?: string; uncertainty?: { p05: number; p95: number }; error?: string };
  const res = o?.error ? `error: ${o.error}` : o?.value != null ? `${short(o.value)} ${o.units ?? ""}${o.uncertainty ? ` [p05–p95 ${short(o.uncertainty.p05)}–${short(o.uncertainty.p95)}]` : ""}` : Array.isArray(t.output) ? `${(t.output as unknown[]).length} items` : "ok";
  return `Ran ${t.name}(${args}) → ${res}`;
}

function Rendered({ text }: { text: string }) {
  const parts = text.split(/(\[(?:S|M):[^\]]+\]|\(removed unsupported claim\))/g);
  return (
    <p className="measure whitespace-pre-wrap leading-relaxed">
      {parts.map((p, i) => {
        if (p === "(removed unsupported claim)") return <span key={i} className="chip border border-bad/50 text-bad">removed unsupported claim</span>;
        const m = p.match(/^\[(S|M):([^\]]+)\]$/);
        if (!m) return <span key={i}>{p}</span>;
        if (m[1] === "M") return <Link key={i} href={`/models/${m[2]}`} className="chip mx-0.5 border border-line text-ink underline-offset-2 hover:underline">M:{m[2]}</Link>;
        const s = source(m[2]);
        return <a key={i} href={s.url ?? "/methods#references"} target="_blank" rel="noreferrer" title={s.title} className="chip mx-0.5 border border-line text-mute hover:text-ink">S:{m[2]}</a>;
      })}
    </p>
  );
}

export function AskPanel({ initial }: { initial?: string }) {
  const role = useMission((s) => s.role);
  const [q, setQ] = useState(initial ?? "");
  const [busy, setBusy] = useState(false);
  const [trace, setTrace] = useState<Trace[]>([]);
  const [ans, setAns] = useState<{ answer: string; mode: string; guard?: { ok: boolean; regenerated?: boolean }; note?: string } | null>(null);
  const started = useRef(false);
  async function ask(question: string) {
    setQ(question); setBusy(true); setTrace([]); setAns(null);
    const t0 = performance.now();
    try {
      const res = await fetch("/api/ask", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ question }) });
      const reader = res.body!.getReader(); const dec = new TextDecoder(); let buf = ""; let last = t0;
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n"); buf = lines.pop() ?? "";
        for (const l of lines) {
          if (!l.trim()) continue;
          const ev = JSON.parse(l);
          const now = performance.now();
          if (ev.type === "trace") { setTrace((t) => [...t, { ...ev, ms: Math.round(now - last) }]); last = now; }
          else if (ev.type === "answer") setAns(ev);
          else if (ev.type === "error") setAns({ answer: ev.message, mode: "error" });
        }
      }
    } catch (e) { setAns({ answer: `Request failed (${String(e)}). The 12 golden questions have cached answers; pick one below.`, mode: "error" }); }
    setBusy(false);
  }
  useEffect(() => { if (initial && !started.current) { started.current = true; ask(initial); } }, [initial]); // eslint-disable-line react-hooks/exhaustive-deps
  const suggested = (ROLE_QUESTIONS[role] ?? [0, 1, 2, 3]).map((i) => GOLDEN_QUESTIONS[i]);
  const others = GOLDEN_QUESTIONS.filter((g) => !suggested.includes(g));
  const href = trace.map((t) => (t.output as { href?: string })?.href).find(Boolean);
  return (
    <div className="space-y-3 text-[14px]" data-testid="ask-panel">
      <form onSubmit={(e) => { e.preventDefault(); if (q.trim()) ask(q.trim()); }} className="flex gap-2">
        <input type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask about microgravity fire safety…" aria-label="Question" className="flex-1" />
        <button className="btn-accent" disabled={busy}>{busy ? "…" : "Ask"}</button>
      </form>
      {!ans && !busy && (
        <div className="space-y-1">
          <p className="label">Suggested</p>
          {suggested.map((g) => <button key={g} className="block w-full border border-line px-2 py-1.5 text-left text-[13px] hover:bg-surface2" style={{ borderRadius: 6 }} onClick={() => ask(g)}>{g}</button>)}
          <details><summary className="cursor-pointer text-[12px] text-mute">More questions ({others.length})</summary>
            {others.map((g) => <button key={g} className="block w-full px-2 py-1 text-left text-[13px] text-mute hover:text-ink" onClick={() => ask(g)}>{g}</button>)}</details>
        </div>
      )}
      {busy && <p className="text-[13px] text-mute" aria-live="polite">Thinking… {trace.length ? `ran ${trace[trace.length - 1].name}` : "choosing tools"}</p>}
      {trace.length > 0 && (
        <details className="border border-line p-2" style={{ borderRadius: 6 }}><summary className="cursor-pointer text-[12px] text-mute">How I got this ({trace.length} tool calls)</summary>
          <ul className="mt-1 space-y-1 font-mono text-[11px] text-mute">{trace.map((t, i) => <li key={i}>{traceLine(t)}{t.ms != null ? ` · ${t.ms} ms` : ""}</li>)}</ul></details>
      )}
      {ans && (
        <div className="space-y-2 border-t border-line pt-3">
          <div className="flex flex-wrap gap-1 text-[12px]">
            {ans.mode !== "live" && <span className="text-mute">{ans.mode === "offline-demo" ? "demo mode · answer composed from tool outputs" : ans.mode}</span>}
            {ans.guard && <span className={ans.guard.ok ? "text-ok" : "text-bad"}>· numeric guard {ans.guard.ok ? "passed" : "removed claims"}{ans.guard.regenerated ? " · regenerated" : ""}</span>}
          </div>
          <Rendered text={ans.answer} />
          {ans.note && <p className="text-[12px] text-mute">{ans.note}</p>}
          <div className="flex gap-2">
            <Link href={href ?? "/console"} className="btn" onClick={() => useMission.setState({ drawer: null })}>Open in Console</Link>
            <CopyButton label="Copy with sources" text={`${ans.answer}\n\nSources:\n${[...new Set([...ans.answer.matchAll(/\[S:([^\]]+)\]/g)].map((m) => m[1]))].map((id) => `- ${source(id).title}${source(id).url ? ` ${source(id).url}` : ""}`).join("\n")}`} />
          </div>
        </div>
      )}
      <p className="text-[12px] text-faint">AI-generated from cited tools and sources; verify before engineering use. PSI contains microgravity and 1 g data only; partial-gravity values are bounded estimates.</p>
    </div>
  );
}
