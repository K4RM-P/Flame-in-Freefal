"use client";
import Link from "next/link";
import { useState } from "react";
import { GOLDEN } from "@/lib/ai/golden";
import { source } from "@/lib/sources";

interface Trace { name: string; input: Record<string, unknown>; output: Record<string, unknown> }
const short = (o: unknown) => (typeof o === "number" ? Number(o.toPrecision(3)) : o);

function traceLine(t: Trace): string {
  const args = Object.entries(t.input ?? {}).map(([k, v]) => `${k}=${typeof v === "object" ? JSON.stringify(v) : short(v)}`).join(", ");
  const o = t.output as { value?: number; units?: string; uncertainty?: { p05: number; p95: number }; error?: string };
  const res = o?.error ? `error: ${o.error}` : o?.value != null ? `${short(o.value)} ${o.units ?? ""}${o.uncertainty ? ` [p05–p95 ${short(o.uncertainty.p05)}–${short(o.uncertainty.p95)}]` : ""}` : Array.isArray(t.output) ? `${(t.output as unknown[]).length} items` : "ok";
  return `Ran ${t.name}(${args}) → ${res}`;
}

function Rendered({ text }: { text: string }) {
  const parts = text.split(/(\[(?:S|M):[^\]]+\])/g);
  return (
    <p className="whitespace-pre-wrap leading-relaxed">
      {parts.map((p, i) => {
        const m = p.match(/^\[(S|M):([^\]]+)\]$/);
        if (!m) return <span key={i}>{p}</span>;
        if (m[1] === "M") return <Link key={i} href={`/models/${m[2]}`} className="chip mx-0.5 border border-accent/60 text-accent">M:{m[2]}</Link>;
        const s = source(m[2]);
        return <a key={i} href={s.url ?? "/methods#references"} target="_blank" rel="noreferrer" title={s.title} className="chip mx-0.5 border border-line text-mute hover:text-accent">S:{m[2]}</a>;
      })}
    </p>
  );
}

export function AskPanel() {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [trace, setTrace] = useState<Trace[]>([]);
  const [ans, setAns] = useState<{ answer: string; mode: string; guard?: { ok: boolean; regenerated?: boolean }; note?: string } | null>(null);
  async function ask(question: string) {
    setQ(question); setBusy(true); setTrace([]); setAns(null);
    try {
      const res = await fetch("/api/ask", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ question }) });
      const reader = res.body!.getReader(); const dec = new TextDecoder(); let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n"); buf = lines.pop() ?? "";
        for (const l of lines) {
          if (!l.trim()) continue;
          const ev = JSON.parse(l);
          if (ev.type === "trace") setTrace((t) => [...t, ev]);
          else if (ev.type === "answer") setAns(ev);
          else if (ev.type === "error") setAns({ answer: ev.message, mode: "error" });
        }
      }
    } catch (e) { setAns({ answer: String(e), mode: "error" }); }
    setBusy(false);
  }
  return (
    <div className="space-y-3 text-sm" data-testid="ask-panel">
      <form onSubmit={(e) => { e.preventDefault(); if (q.trim()) ask(q.trim()); }} className="flex gap-2">
        <input type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask about microgravity fire safety…" className="flex-1" />
        <button className="btn-accent" disabled={busy}>{busy ? "…" : "Ask"}</button>
      </form>
      <div className="flex flex-wrap gap-1">{GOLDEN.map((g) => <button key={g.id} className="chip border border-line text-left text-mute hover:text-ink" onClick={() => ask(g.q)}>{g.q}</button>)}</div>
      {trace.length > 0 && (
        <details open className="rounded border border-line p-2"><summary className="label cursor-pointer">Tool-call trace ({trace.length})</summary>
          <ul className="mt-1 space-y-1 font-mono text-[11px] text-mute">{trace.map((t, i) => <li key={i}>{traceLine(t)}</li>)}</ul></details>
      )}
      {ans && (
        <div className="rounded border border-line p-3">
          <div className="mb-1 flex flex-wrap gap-1">
            <span className={`chip ${ans.mode === "live" ? "bg-ok/15 text-ok" : "bg-warn/15 text-warn"}`}>{ans.mode === "live" ? "live Claude answer" : ans.mode === "offline-demo" ? "demo mode: cached answer composed from tool outputs" : ans.mode}</span>
            {ans.guard && <span className={`chip ${ans.guard.ok ? "bg-ok/15 text-ok" : "bg-bad/15 text-bad"}`}>numeric guard {ans.guard.ok ? "passed" : "removed claims"}{ans.guard.regenerated ? " · regenerated" : ""}</span>}
          </div>
          <Rendered text={ans.answer} />
          {ans.note && <p className="mt-1 text-xs text-mute">{ans.note}</p>}
        </div>
      )}
      <p className="text-xs text-mute">AI-generated from cited tools and sources; verify before engineering use. PSI contains microgravity and 1 g data only; partial-gravity values are bounded estimates.</p>
    </div>
  );
}

export function AskSlideOver() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className="fixed bottom-5 right-5 z-40 rounded-full bg-accent px-4 py-2 text-sm font-medium text-black shadow-lg">Ask EmberAtlas</button>
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={() => setOpen(false)}>
          <aside className="h-full w-full max-w-lg overflow-y-auto border-l border-line bg-panel p-4" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between"><h3 className="font-semibold">Ask EmberAtlas</h3><button className="btn" onClick={() => setOpen(false)}>Close</button></div>
            <AskPanel />
          </aside>
        </div>
      )}
    </>
  );
}
