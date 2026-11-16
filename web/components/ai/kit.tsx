"use client";
// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// One AI look for the interview, the analyst drawer and Aster: orb, glow panel, thinking trail (real server/worker
// steps only), streamed answer with number + citation chips, guard badge and offline chip.
import { useCallback, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ShieldCheck, ShieldAlert } from "lucide-react";
import { emptyRun, readEvents, reduceRun, type AiEvent, type AiRun, type Trail } from "@/lib/ai/stream";
import { MeshGradientSVG } from "@/components/ui/shader-svg";
import { cn } from "@/lib/utils";

export type OrbState = "idle" | "thinking" | "speaking" | "offline";
export function Orb({ state, size = 14, className, interactive = false }: {
  state: OrbState; size?: number; className?: string; interactive?: boolean;
}) {
  return <MeshGradientSVG state={state} size={size} className={className} interactive={interactive} />;
}
export const orbOf = (run: AiRun | null): OrbState => (!run ? "idle" : run.error || run.done?.offline ? "offline" : run.streaming ? "thinking" : "speaking");

/** Liquid-glass AI surface: hairline warm ring that turns + blooms while thinking, flow line on top. */
export function AiGlow({ thinking, children, className, testid }: { thinking: boolean; children: ReactNode; className?: string; testid?: string }) {
  return (
    <div className={cn("ai-glow", className)} data-thinking={thinking} data-testid={testid}>
      <div className="ai-glow__inner glass overflow-hidden">
        <div className="ai-flow" data-on={thinking} aria-hidden />
        <div className="p-3.5">{children}</div>
      </div>
    </div>
  );
}

export function OfflineChip({ on }: { on: boolean }) {
  if (!on) return null;
  return <span className="rounded-full border border-line px-2 py-0.5 text-[11px] text-faint" data-testid="offline-chip" title="No OpenAI key or the API failed: deterministic engine/catalog answer">Offline</span>;
}

/** Pill composer with a round send button (Aster, analyst). */
export function Composer({ value, onChange, onSubmit, placeholder, disabled, busy, label, testid }: { value: string; onChange: (v: string) => void; onSubmit: () => void; placeholder: string; disabled?: boolean; busy?: boolean; label: string; testid?: string }) {
  return (
    <form className="ai-composer" onSubmit={(e) => { e.preventDefault(); if (value.trim() && !busy) onSubmit(); }} data-testid={testid}>
      <input type="text" aria-label={label} placeholder={placeholder} value={value} maxLength={800} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
      <button type="submit" className="ai-send" aria-label="Send" disabled={disabled || busy || !value.trim()}>
        {busy ? <span className="ai-arc" style={{ width: 14, height: 14 }} /> : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 19V5M5 12l7-7 7 7" /></svg>}
      </button>
    </form>
  );
}

export function ThinkingTrail({ steps }: { steps: Trail[] }) {
  const reduce = useReducedMotion();
  if (!steps.length) return null;
  return (
    <ol className="space-y-1.5 text-[12.5px]" aria-label="What the SI is doing" data-testid="thinking-trail">
      <AnimatePresence initial={false}>
        {steps.map((s) => (
          <motion.li key={s.id} className="flex items-center gap-2" data-step={s.id} data-status={s.status}
            initial={reduce ? false : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 380, damping: 30 }}>
            {s.status === "done"
              ? <svg width="12" height="12" viewBox="0 0 24 24" aria-label="done" className="flex-none text-ember"><motion.path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"
                  initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }} /></svg>
              : <span className="ai-arc" aria-hidden />}
            <span className={s.status === "active" ? "ai-shimmer" : "text-faint"}>{s.label}</span>
          </motion.li>
        ))}
      </AnimatePresence>
    </ol>
  );
}

export function Cites({ ids }: { ids?: string[] }) {
  if (!ids?.length) return null;
  return <div className="flex flex-wrap gap-1.5" data-testid="cites">{ids.map((c) => <a key={c} href={`/evidence#${c.toLowerCase()}`} className="ai-chip !px-2.5 !py-0.5 font-mono !text-[11px]">{c}</a>)}</div>;
}

export function GuardBadge({ ok, stripped, checked, against = "the engine" }: { ok: boolean; stripped?: boolean; checked?: number; against?: string }) {
  const label = checked === undefined ? "Every number checked against the engine" : checked === 0 ? "No numbers in this answer" : `${checked} number${checked === 1 ? "" : "s"} checked against ${against}`;
  return ok && !stripped
    ? <p className="flex items-center gap-1.5 text-[11.5px] text-faint" data-testid="guard"><ShieldCheck size={13} strokeWidth={1.5} className="text-ok" />{label}</p>
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
  if (run.streaming && !run.text) return <div className="space-y-2 pt-1" aria-busy="true" data-testid="answer-skeleton">{["92%", "78%", "60%"].map((w) => <div key={w} className="ai-skel h-2.5 rounded-full" style={{ width: w }} />)}</div>;
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
    } catch (e) { apply({ type: "error", error: `The SI could not be reached (${String((e as Error)?.message ?? e)}).` }); }
    return cur;
  }, []);
  return { run, start, setRun };
}
