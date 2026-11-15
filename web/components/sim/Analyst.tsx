"use client";
// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// The AI analyst (drawer "AI" tab): auto-briefing (streamed, number + citation chips, guard), ranked fixes with
// Apply & re-run, Ask anything (what-ifs run the engine; other questions stream from /api/interpret), next test.
import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { guard } from "@/lib/ai/guard";
import { emptyRun, readEvents, reduceRun, type AiEvent, type AiRun } from "@/lib/ai/stream";
import { parseWhatIf, suggestQuestions, whatIfAnswer, whatIfFacts } from "@/lib/ai/whatIf";
import { nextTest } from "@/lib/sim/nextTest";
import { runInWorker } from "@/lib/sim/runInWorker";
import type { Scenario, SimResult } from "@/lib/sim/types";
import { Button } from "@/components/ui/button";
import { AiGlow, Cites, GuardBadge, OfflineChip, Orb, StreamAnswer, ThinkingTrail, orbOf, type EngineValue } from "@/components/ai/kit";
import { DesignReview } from "./DesignReview";
import { compact, evidenceForAI, MC_N } from "./bits";
import { useSim, type ChatMsg } from "./store";

export const engineValues = (r: SimResult | null): EngineValue[] =>
  (r?.outcome.metrics ?? []).filter((m) => m.value !== null).map((m) => ({ label: m.label, value: m.value as number, units: m.units }));

function updateLast(run: AiRun, extra: Partial<ChatMsg> = {}) {
  const chat = [...useSim.getState().chat];
  const i = chat.length - 1;
  if (i >= 0 && chat[i].role === "assistant") chat[i] = { ...chat[i], run, text: run.text, ...extra };
  useSim.getState().set({ chat });
}

export async function askAnalyst(question: string) {
  const { a, ra, b, rb, set, chat } = useSim.getState();
  if (!a || !ra) return;
  let run = emptyRun();
  set({ asking: true, chat: [...chat, { role: "user", text: question }, { role: "assistant", text: "", run }] });
  const apply = (e: AiEvent) => { run = reduceRun(run, e); updateLast(run); };
  const w = parseWhatIf(question, a);
  try {
    if (w) {
      // Every step below is a real client/worker event: parse, worker run, guard.
      apply({ type: "step", id: "detect", label: `Changing ${w.changes.join(", ")}`, status: "done" });
      apply({ type: "step", id: "sim", label: "Running the simulation…", status: "active" });
      const r2 = await runInWorker(w.scenario, { mc: MC_N });
      apply({ type: "step", id: "sim", label: "Engine run complete", status: "done" });
      const text = whatIfAnswer(w, ra, r2);
      const g = guard(text, [compact(ra), compact(r2), whatIfFacts(ra, r2), w.scenario, a], question);
      apply({ type: "step", id: "guard", label: g.ok ? "Numbers checked against the engine ✓" : `Unsupported numbers: ${g.unsupported.join(", ")}`, status: "done" });
      apply({ type: "token", text });
      apply({ type: "done", data: { text, guard: { ok: g.ok }, offline: false, local: true } });
      updateLast(run, { whatIf: w.scenario });
    } else {
      const res = await fetch("/api/interpret", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stream: true, question, scenario: a, result: compact(ra), evidence: evidenceForAI(a), ...(b && rb && { compare: { scenario: b, result: compact(rb) } }) }) });
      await readEvents(res, apply);
      if (run.streaming) apply({ type: "done", data: { text: run.text } });
      updateLast(run, { citations: (run.done?.citations as string[]) ?? [], offline: !!run.done?.offline });
    }
  } catch (e) { apply({ type: "error", error: `The AI could not answer (${String((e as Error)?.message ?? e)}).` }); }
  useSim.getState().set({ asking: false });
}

/** Open a what-if as Scenario B and run the A/B compare. */
async function openAsB(s: Scenario) {
  const { runAll } = await import("./bits");
  useSim.getState().set({ b: s, editing: "a", ra: null, rb: null, frame: 0 });
  await runAll();
  useSim.getState().set({ frame: 0, playing: true });
}

export function Briefing() {
  const { brief, ra } = useSim();
  const [hot, setHot] = useState<string | null>(null);
  const engine = useMemo(() => engineValues(ra), [ra]);
  if (!ra) return <p className="text-[13px] text-mute">The AI briefing appears after a run.</p>;
  if (!brief) return null;
  const d = brief.done ?? {};
  const g = d.guard as { ok?: boolean; stripped?: boolean } | undefined;
  return (
    <AiGlow thinking={brief.streaming} testid="briefing">
      <div className="mb-2 flex items-center gap-2"><Orb state={orbOf(brief)} /><p className="ea-meta ai-iris flex-1">Briefing</p><OfflineChip on={!!d.offline} /></div>
      <ThinkingTrail steps={brief.steps} />
      <div className="mt-2"><StreamAnswer run={brief} engine={engine} onHot={setHot} /></div>
      {!brief.streaming && engine.length > 0 && <ul className="mt-2 grid grid-cols-2 gap-x-3 text-[12px]" aria-label="Engine values">
        {engine.slice(0, 6).map((e) => <li key={e.label} data-hot={hot === e.label} className={`num rounded px-1 transition-colors ${hot === e.label ? "bg-surface2 text-ink" : "text-faint"}`}>{e.label}: {+e.value.toPrecision(4)} {e.units}</li>)}
      </ul>}
      {!brief.streaming && <div className="mt-2 space-y-1.5"><Cites ids={d.citations as string[] | undefined} />{g && <GuardBadge ok={!!g.ok} stripped={g.stripped} />}</div>}
    </AiGlow>
  );
}

function Chat() {
  const { chat, a, ra } = useSim();
  const engine = useMemo(() => engineValues(ra), [ra]);
  return <div className="space-y-3">{chat.map((m, i) => m.role === "user"
    ? <p key={i} className="ml-8 rounded-lg border border-line bg-bg p-2.5 text-[13px]">{m.text}</p>
    : <AiGlow key={i} thinking={!!m.run?.streaming}>
        <div className="mb-1 flex items-center gap-2"><Orb state={orbOf(m.run ?? null)} size={12} /><span className="flex-1" /><OfflineChip on={!!m.run?.done?.offline} /></div>
        {m.run ? <><ThinkingTrail steps={m.run.steps} /><div className="mt-1.5"><StreamAnswer run={m.run} engine={engine} /></div>
          {!m.run.streaming && !m.run.error && <div className="mt-1.5 space-y-1.5"><Cites ids={m.citations} /><GuardBadge ok={(m.run.done?.guard as { ok?: boolean } | undefined)?.ok !== false} /></div>}</>
          : <p className="text-[13px]">{m.text}</p>}
        {m.whatIf && a && <Button size="sm" variant="secondary" className="mt-2 h-7" data-testid="open-as-b" onClick={() => void openAsB(m.whatIf!)}>Open as scenario B</Button>}
      </AiGlow>)}</div>;
}

function NextTestCard({ sc, r }: { sc: Scenario; r: SimResult }) {
  const nt = useMemo(() => nextTest(sc, r), [sc, r]);
  const [copied, setCopied] = useState(false);
  if (!nt) return <section className="rounded-lg border border-line p-3 text-[13px] text-mute" data-testid="next-test-card">Next test: inside the tested envelope, no new test needed for this scenario.</section>;
  const spec = JSON.stringify({ next_test: nt, scenario: { name: sc.name, cabin: sc.cabin, items: sc.items, detection: sc.detection, suppression: sc.suppression } }, null, 2);
  return (
    <section className="space-y-1.5 rounded-lg border border-line p-3 text-[13px]" data-testid="next-test-card">
      <p className="ea-meta">The next test to fly</p>
      <p className="font-medium">{nt.condition}</p><p className="text-mute">{nt.reason}</p>
      <Button size="sm" variant="secondary" className="h-7" onClick={() => { void navigator.clipboard?.writeText(spec).then(() => setCopied(true)).catch(() => setCopied(false)); }}>{copied ? "Copied ✓" : "Copy test spec"}</Button>
    </section>
  );
}

export function Analyst() {
  const { a, b, ra, rb, asking } = useSim();
  const [q, setQ] = useState("");
  const sugg = useMemo(() => (a && ra ? suggestQuestions(a, ra) : []), [a, ra]);
  if (!a) return null;
  return (
    <div className="space-y-4" data-testid="analyst">
      <Briefing />
      {ra && <DesignReview sc={a} r={ra} label={b ? "A" : null} />}
      <Chat />
      {ra && <div className="space-y-1.5"><p className="ea-meta">Ask anything</p>
        {sugg.map((s) => <button key={s} type="button" disabled={asking} data-testid="suggested-q" className="block w-full rounded-lg border border-line px-3 py-2 text-left text-[13px] text-mute transition-colors hover:border-faint/50 hover:text-ink disabled:opacity-50" onClick={() => void askAnalyst(s)}>{s}</button>)}
        <form className="flex gap-2 pt-1" onSubmit={(e) => { e.preventDefault(); const t = q.trim(); if (t) { setQ(""); void askAnalyst(t); } }}>
          <input type="text" className="min-w-0 flex-1" aria-label="Question for the AI" placeholder="Ask, or try “what if O₂ were 25 %?”" value={q} maxLength={800} onChange={(e) => setQ(e.target.value)} />
          <Button size="sm" className="h-8" disabled={asking || !q.trim()}>Ask</Button>
        </form>
      </div>}
      {ra && <NextTestCard sc={b && rb ? b : a} r={b && rb ? rb : ra} />}
    </div>
  );
}

/** Right-edge orb tab: opens the drawer; pulses once when a new briefing is ready. */
export function OrbTab() {
  const { brief, briefSeen, drawer, ra, set } = useSim();
  const reduce = useReducedMotion();
  if (drawer || !ra) return null;
  const ready = !!brief && !brief.streaming && !briefSeen;
  return (
    <motion.button type="button" data-testid="ask-ai" aria-label={ready ? "Briefing ready: open the AI analyst" : "Open the AI analyst"}
      className={`absolute right-0 top-1/3 z-30 flex flex-col items-center gap-1.5 rounded-l-lg border border-r-0 border-line bg-panel/90 px-2 py-3 text-[11px] text-mute backdrop-blur ${ready ? "ai-pulse-once" : ""}`}
      initial={reduce ? false : { x: 24, opacity: 0 }} animate={{ x: 0, opacity: 1 }} onClick={() => set({ drawer: "ai", briefSeen: true })}>
      <Orb state={orbOf(brief)} size={16} /><span className="[writing-mode:vertical-rl]">{ready ? "Briefing ready" : brief?.streaming ? "Thinking…" : "AI analyst"}</span>
    </motion.button>
  );
}
