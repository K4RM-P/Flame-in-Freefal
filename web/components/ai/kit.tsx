"use client";
// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// One AI look for the interview, the analyst drawer and Aster: orb, glow panel, thinking trail (real server/worker
// steps only), streamed answer with number + citation chips, guard badge and offline chip.
import { useCallback, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, ShieldCheck, ShieldAlert } from "lucide-react";
import { emptyRun, readEvents, reduceRun, type AiEvent, type AiRun, type Trail } from "@/lib/ai/stream";
import { cn } from "@/lib/utils";

export type OrbState = "idle" | "thinking" | "speaking" | "offline";
export function Orb({ state, size = 14, className }: { state: OrbState; size?: number; className?: string }) {
  return <span aria-hidden data-orb={state} data-state={state} className={cn("ai-orb", className)} style={{ width: size, height: size }}><span className="ai-orb__spark" /><span className="ai-orb__spark" /></span>;
}
export const orbOf = (run: AiRun | null): OrbState => (!run ? "idle" : run.error || run.done?.offline ? "offline" : run.streaming ? (run.text ? "speaking" : "thinking") : "speaking");

/** Glass panel with the rotating gradient edge; it spins only while the AI is working. */
export function AiGlow({ thinking, children, className, testid }: { thinking: boolean; children: ReactNode; className?: string; testid?: string }) {
  return <div className={cn("ai-glow rounded-lg", className)} data-thinking={thinking} data-testid={testid}><div className="ai-glow__inner p-3">{children}</div></div>;
}

export function OfflineChip({ on }: { on: boolean }) {
  if (!on) return null;
  return <span className="ea-pill" data-testid="offline-chip" title="No OpenAI key or the API failed: deterministic engine/catalog answer">offline mode</span>;
}

export function ThinkingTrail({ steps }: { steps: Trail[] }) {
  const reduce = useReducedMotion();
  if (!steps.length) return null;
  return (
    <ol className="space-y-1 text-[12px]" aria-label="What the AI is doing" data-testid="thinking-trail">
      <AnimatePresence initial={false}>
        {steps.map((s) => (
          <motion.li key={s.id} className="flex items-center gap-2" data-step={s.id} data-status={s.status}
            initial={reduce ? false : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 380, damping: 30 }}>
            {s.status === "done" ? <Check size={12} strokeWidth={2} className="text-ok" aria-label="done" /> : <Orb state="thinking" size={9} />}
            <span className={s.status === "active" ? "ai-shimmer" : "text-mute"}>{s.label}</span>
          </motion.li>
        ))}
      </AnimatePresence>
    </ol>
  );
}

export function Cites({ ids }: { ids?: string[] }) {
  if (!ids?.length) return null;
  return <div className="flex flex-wrap gap-1.5" data-testid="cites">{ids.map((c) => <a key={c} href={`/evidence#${c.toLowerCase()}`} className="ea-pill hover:text-ink" data-tone="ember">{c}</a>)}</div>;
}

export function GuardBadge({ ok, stripped }: { ok: boolean; stripped?: boolean }) {
  return ok && !stripped
    ? <p className="flex items-center gap-1.5 text-[12px] text-ok" data-testid="guard"><ShieldCheck size={13} strokeWidth={1.5} />Numbers checked against the engine ✓</p>
    : <p className="flex items-center gap-1.5 text-[12px] text-warn" data-testid="guard"><ShieldAlert size={13} strokeWidth={1.5} />Unsupported numbers removed</p>;
}

export interface EngineValue { label: string; value: number; units: string }
const NUM = /[-−]?\d+(?:\.\d+)?/g;
/** Text with every number as a chip; hovering marks the engine value it matches (to 1 %). */
export function NumberText({ text, engine = [], onHot }: { text: string; engine?: EngineValue[]; onHot?: (label: string | null) => void }) {
  const out: ReactNode[] = [];
  let last = 0, k = 0;
  for (const m of text.matchAll(NUM)) {
    const i = m.index ?? 0;
    if (/[A-Za-z₀-₉-]$/.test(text.slice(Math.max(0, i - 1), i)) && !/\s$/.test(text.slice(i - 1, i))) continue; // PSI-99, O₂ …
    out.push(text.slice(last, i));
    const x = Number(m[0].replace("−", "-"));
    const hit = engine.find((e) => Math.abs(e.value - x) <= Math.max(0.5, Math.abs(e.value) * 0.01));
    out.push(<span key={k++} className="ai-numchip" data-numchip title={hit ? `Engine: ${hit.label} = ${hit.value} ${hit.units}` : "Number from the tool output"}
      onMouseEnter={() => onHot?.(hit?.label ?? null)} onMouseLeave={() => onHot?.(null)}>{m[0]}</span>);
    last = i + m[0].length;
  }
  out.push(text.slice(last));
  return <>{out}</>;
}

/** Streamed answer: chunks fade in while streaming; once done, numbers become chips. */
export function StreamAnswer({ run, engine, onHot }: { run: AiRun; engine?: EngineValue[]; onHot?: (l: string | null) => void }) {
  if (run.error && !run.text) return <p className="text-[13px] text-warn" role="status">{run.error}</p>;
  if (run.streaming && !run.text) return <div className="space-y-1.5" aria-busy="true" data-testid="answer-skeleton"><div className="h-3 w-5/6 animate-pulse rounded bg-surface2" /><div className="h-3 w-2/3 animate-pulse rounded bg-surface2" /><div className="h-3 w-3/4 animate-pulse rounded bg-surface2" /></div>;
  return (
    <p className="measure whitespace-pre-line text-[14px] leading-relaxed" data-testid="ai-answer">
      {run.streaming ? run.chunks.map((c, i) => <span key={i} className="ai-fade">{c}</span>) : <NumberText text={run.text} engine={engine} onHot={onHot} />}
    </p>
  );
}

/** POST a streaming AI request and reduce its events. */
export function useAiStream() {
  const [run, setRun] = useState<AiRun | null>(null);
  const seq = useRef(0);
  const start = useCallback(async (url: string, body: unknown, onEvent?: (e: AiEvent) => void) => {
    const id = ++seq.current;
    let cur = emptyRun();
    setRun(cur);
    const apply = (e: AiEvent) => { if (id !== seq.current) return; cur = reduceRun(cur, e); setRun(cur); onEvent?.(e); };
    try {
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...(body as object), stream: true }) });
      await readEvents(res, apply);
      if (cur.streaming) apply({ type: "done", data: { text: cur.text } });
    } catch (e) { apply({ type: "error", error: `The AI could not be reached (${String((e as Error)?.message ?? e)}).` }); }
    return cur;
  }, []);
  return { run, start, setRun };
}
