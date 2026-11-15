"use client";
// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// "✦ Build with AI": a modal interview (open prompt → ≤ 4 follow-ups → review) with a live draft schematic, then Ignite.
// Server: /api/scenario parse|followups|finalize; offline it is the rule-based parser + fixed questions (same UX).
import { useState } from "react";
import { create } from "zustand";
import { motion, useReducedMotion } from "motion/react";
import type { Answers, BuiltDraft, Question } from "@/lib/ai/localScenario";
import { applyNoFireFix, noFireReason } from "@/lib/sim/noFire";
import type { Scenario } from "@/lib/sim/types";
import { Button } from "@/components/ui/button";
import { runAll } from "./bits";
import { useSim } from "./store";

export const useAi = create<{ open: boolean; rejected: BuiltDraft["rejected"]; offline: boolean; set: (p: Partial<{ open: boolean; rejected: BuiltDraft["rejected"]; offline: boolean }>) => void }>((set) => ({
  open: false, rejected: [], offline: false, set: (p) => set(p),
}));

async function post(body: unknown) {
  const r = await fetch("/api/scenario", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? `HTTP ${r.status}`);
  return r.json();
}

/** Apply a scenario to the store and run it (unless nothing can burn). */
export async function igniteScenario(s: Scenario) {
  useSim.getState().set({ a: s, b: null, editing: "a", presetId: null, replay: false, ra: null, rb: null, frame: 0, interp: { state: "idle" }, runError: null });
  if (!s.items.length) return;
  await runAll();
  if (useSim.getState().ra) useSim.getState().set({ frame: 0, playing: true });
}

const EXAMPLES = ["ISS module, cotton fabric panel catches fire", "Moon base at 34% oxygen with a Nomex curtain", "Cygnus cargo ship, paper burning"];
const SRC: Record<string, string> = { nasa: "NASA-cited", user: "you said", assumption: "AI assumption" };

export function BuildWithAiButton({ className = "" }: { className?: string }) {
  const setAi = useAi((s) => s.set);
  return <Button size="sm" className={`btn-accent h-8 ${className}`} data-testid="build-ai" onClick={() => setAi({ open: true })}><Orb state="idle" /> ✦ Build with AI</Button>;
}

export function Orb({ state }: { state: "idle" | "thinking" | "speaking" | "offline" }) {
  const reduce = useReducedMotion();
  const bg = state === "offline" ? "transparent" : "radial-gradient(circle at 35% 35%, #FFD2B8, #FF6B2C 55%, transparent 75%)";
  return <motion.span aria-hidden data-orb={state} className={`inline-block h-3 w-3 rounded-full ${state === "offline" ? "border border-faint" : ""}`} style={{ background: bg, opacity: state === "idle" ? 0.6 : 1 }}
    animate={reduce || state !== "thinking" ? undefined : { scale: [1, 1.25, 1] }} transition={{ duration: 1.6, repeat: Infinity }} />;
}

export function AiInterview() {
  const { open, set: setAi } = useAi();
  const [step, setStep] = useState<"prompt" | "ask" | "review">("prompt");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [qs, setQs] = useState<Question[]>([]);
  const [qi, setQi] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [draft, setDraft] = useState<BuiltDraft | null>(null);
  const [offline, setOffline] = useState(false);
  if (!open) return null;
  const close = () => { setAi({ open: false }); setStep("prompt"); setQi(0); setErr(null); };

  async function start() {
    setBusy(true); setErr(null);
    try {
      const p = await post({ mode: "parse", text });
      const f = await post({ mode: "followups", text, answers: p.draft.answers });
      setDraft(p.draft); setAnswers(p.draft.answers); setOffline(!!p.offline); setQs(f.questions); setQi(0);
      setStep(f.questions.length ? "ask" : "review");
    } catch (e) { setErr(String((e as Error).message ?? e)); } finally { setBusy(false); }
  }
  async function answer(q: Question, v: string) {
    const next = { ...answers, [q.id]: v } as Answers;
    setAnswers(next);
    try { const p = await post({ mode: "parse", text, answers: next }); setDraft(p.draft); } catch { /* keep the previous draft */ }
    if (qi + 1 < qs.length) setQi(qi + 1); else setStep("review");
  }
  async function ignite() {
    setBusy(true);
    try {
      const fin = await post({ mode: "finalize", text, answers });
      const d: BuiltDraft = fin.draft;
      setAi({ open: false, rejected: d.rejected, offline: !!fin.offline });
      setStep("prompt"); setQi(0);
      if (d.scenario) await igniteScenario(d.scenario);
    } catch (e) { setErr(String((e as Error).message ?? e)); } finally { setBusy(false); }
  }
  const sc = draft?.scenario;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-bg/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Build with AI" data-testid="ai-interview"
      onKeyDown={(e) => e.key === "Escape" && close()}>
      <div className="grid w-full max-w-3xl gap-4 rounded-lg border border-line bg-panel/95 p-5 shadow-2xl md:grid-cols-[1fr_260px]">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-[16px] font-medium"><Orb state={busy ? "thinking" : offline ? "offline" : "idle"} /> AI fire engineer</h2>
            <div className="flex items-center gap-2">
              {offline && <span className="rounded border border-line px-1.5 text-[11px] text-mute" data-testid="offline-chip">offline mode</span>}
              <button type="button" className="text-faint hover:text-ink" aria-label="Close" onClick={close}>✕</button>
            </div>
          </div>
          <div className="flex gap-1" aria-label="Progress">{["prompt", ...qs.map((q) => q.id), "review"].map((k, i) => <span key={k + i} className={`h-1.5 w-1.5 rounded-full ${i <= (step === "prompt" ? 0 : step === "ask" ? qi + 1 : qs.length + 1) ? "bg-ember" : "bg-line"}`} />)}</div>
          {step === "prompt" && <>
            <label htmlFor="ai-prompt" className="text-[14px]">Describe the spacecraft and what might catch fire.</label>
            <textarea id="ai-prompt" rows={3} className="w-full" value={text} onChange={(e) => setText(e.target.value)} data-testid="ai-prompt" />
            <div className="flex flex-wrap gap-1.5">{["ISS module", "Moon base", "Cargo ship"].map((l, i) => <button key={l} type="button" className="btn text-[12px]" onClick={() => setText(EXAMPLES[i])}>{l}</button>)}</div>
            <Button size="sm" disabled={busy || text.trim().length < 3} onClick={() => void start()} data-testid="ai-next">{busy ? "Reading…" : "Next"}</Button>
          </>}
          {step === "ask" && qs[qi] && <div className="space-y-2" data-testid="ai-question">
            <p className="text-[14px]">{qs[qi].question}</p>
            <div className="flex flex-wrap gap-1.5">{qs[qi].options.map((o) => <button key={o.value} type="button" className="btn text-[13px]" onClick={() => void answer(qs[qi], o.value)}>
              {o.label}{o.badge && <span className="ml-1 text-[11px] text-faint">{o.badge}</span>}</button>)}</div>
          </div>}
          {step === "review" && draft && <div className="space-y-1.5" data-testid="ai-review">
            <p className="text-[14px]">Review every field. Amber = AI assumption: confirm by igniting, or edit after.</p>
            <ul className="max-h-56 space-y-1 overflow-auto text-[12px]">{Object.entries(draft.fields).map(([k, f]) => <li key={k} className={f.source === "assumption" ? "text-warn" : "text-mute"}><span className="num">{k}</span> · {SRC[f.source]} · {f.note}</li>)}</ul>
            {draft.rejected.map((r, i) => <p key={i} className="text-[12px] text-warn">✕ {r.reason}</p>)}
            {draft.notes.map((n, i) => <p key={i} className="text-[12px] text-mute">• {n}</p>)}
            <Button size="sm" className="btn-accent" disabled={busy} onClick={() => void ignite()} data-testid="ai-ignite">Ignite simulation</Button>
          </div>}
          {err && <p className="text-[13px] text-warn" role="alert">{err}</p>}
        </div>
        <aside className="space-y-2 border-l border-line pl-4 text-[12px]" aria-label="Live draft">
          <p className="label">Live draft</p>
          {sc ? <>
            <div className="flex flex-wrap gap-1"><span className="rounded border border-line px-1.5 num">O₂ {(sc.cabin.x_o2 * 100).toFixed(1)} %</span><span className="rounded border border-line px-1.5 num">{(sc.cabin.P_Pa / 1e3).toFixed(1)} kPa</span><span className="rounded border border-line px-1.5 num">{sc.cabin.gravity_g} g</span></div>
            <div className="relative h-24 rounded border border-line">{sc.items.map((it, i) => <span key={it.id} className="absolute rounded-sm border border-line bg-surface2 px-1" style={{ left: 8 + i * 60, top: 30 }}>{it.material_key}{it.ignite && <span className="ml-1 inline-block h-2 w-2 animate-pulse rounded-full bg-ember motion-reduce:animate-none" />}</span>)}
              {!sc.items.length && <span className="absolute inset-0 grid place-items-center text-faint">no items</span>}</div>
          </> : <p className="text-faint">Fills in as you answer.</p>}
        </aside>
      </div>
    </div>
  );
}

/** Calm empty state over a dimmed cabin when the run has no flame, with a one-click fix. */
export function NoFireCard() {
  const { a, ra, running } = useSim();
  const rejected = useAi((s) => s.rejected);
  if (!a || running) return null;
  const hasRun = !!ra;
  const nf = noFireReason(a, ra, rejected);
  if (!nf || (!hasRun && (nf.reason === "no_ignition" || nf.reason === "too_little_oxygen"))) return null;
  return (
    <div className="absolute inset-0 z-20 grid place-items-center bg-bg/60" data-testid="no-fire">
      <div className="max-w-sm space-y-2 rounded-lg border border-line bg-panel p-4">
        <p className="text-[16px] font-medium" data-testid="no-fire-title">✕ {nf.title}</p>
        <p className="text-[13px] text-mute">{nf.detail}</p>
        {nf.fix && <Button size="sm" data-testid="no-fire-fix" onClick={() => { useAi.getState().set({ rejected: [] }); void igniteScenario(applyNoFireFix(a, nf.fix!)); }}>{nf.fix.label}</Button>}
      </div>
    </div>
  );
}
