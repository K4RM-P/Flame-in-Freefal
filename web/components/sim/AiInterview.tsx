"use client";
// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// "✦ Build with AI": a modal interview (open prompt → ≤ 4 follow-ups → review) with a live draft schematic, then Ignite.
// Server: /api/scenario parse|followups|finalize; offline it is the rule-based parser + fixed questions (same UX).
// Also: the calm "no fire" card over the dimmed cabin, with a one-click fix.
import { useEffect, useState } from "react";
import { create } from "zustand";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { buildFromAnswers, type Answers, type BuiltDraft, type FieldTag, type Question } from "@/lib/ai/localScenario";
import type { Trail } from "@/lib/ai/stream";
import { applyNoFireFix, noFireReason } from "@/lib/sim/noFire";
import type { Scenario } from "@/lib/sim/types";
import { Button } from "@/components/ui/button";
import { AiGlow, Composer, OfflineChip, Orb, ThinkingTrail } from "@/components/ai/kit";
import { runAll } from "./bits";
import { materialByKey } from "./data";
import { useSim } from "./store";

export const BUILD_AI_EVENT = "emberatlas:build-ai";
type AiUi = { open: boolean; rejected: BuiltDraft["rejected"]; offline: boolean; seed: string };
export const useAi = create<AiUi & { set: (p: Partial<AiUi>) => void }>((set) => ({ open: false, rejected: [], offline: false, seed: "", set: (p) => set(p) }));

async function post(body: unknown) {
  const r = await fetch("/api/scenario", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? `HTTP ${r.status}`);
  return r.json();
}

/** Apply a scenario to the store, ease the camera to the ignition point and run (unless nothing can burn). */
export async function igniteScenario(s: Scenario) {
  useSim.getState().set({ a: s, b: null, editing: "a", presetId: null, replay: false, ra: null, rb: null, frame: 0, interp: { state: "idle" }, runError: null, brief: null, chat: [], view: "3d" });
  if (!s.items.length) return;
  await runAll();
  if (useSim.getState().ra) useSim.getState().set({ frame: 0, playing: true, camPreset: { id: 2, nonce: Date.now() } });
}

const EXAMPLES: [string, string][] = [["ISS module", "ISS module, cotton fabric panel catches fire"], ["Moon base", "Moon base at 34% oxygen with a SIBAL curtain near a hot wire"], ["Cargo ship", "Cygnus cargo ship, fabric bag catches fire"]];
const SRC: Record<FieldTag["source"], string> = { nasa: "NASA-cited", user: "you said", assumption: "SI assumption" };
const TONE: Record<FieldTag["source"], string> = { nasa: "text-ok", user: "text-blue", assumption: "text-warn" };

export function BuildWithAiButton({ className = "", large = false }: { className?: string; large?: boolean }) {
  const setAi = useAi((s) => s.set);
  return <button type="button" className={`ai-cta ${className}`} data-size={large ? "lg" : undefined} data-testid="build-ai" onClick={() => setAi({ open: true })}><span className="ai-star" aria-hidden>✦</span>Build with SI</button>;
}

/** Re-build the draft from the answers on the client (same pure builder as the server; no request, no AI). */
function refine(d: BuiltDraft, a: Answers, offline: boolean): BuiltDraft {
  const mats = d.scenario?.items.map((i) => i.material_key) ?? [];
  return buildFromAnswers(a, mats, { rejected: d.rejected, empty: !mats.length && !a.material && !d.missing.includes("material"), offline, name: d.scenario?.name });
}

/** Steps derived from what the parse actually returned (no timers). */
function parseSteps(d: BuiltDraft): Trail[] {
  const out: Trail[] = [{ id: "read", label: "Read your description", status: "done" }];
  const mats = d.scenario?.items.map((i) => materialByKey(i.material_key)?.display_name ?? i.material_key) ?? [];
  out.push({ id: "mat", label: mats.length ? `Matched ${mats.join(", ")} in NASA's material data` : d.rejected.length ? `“${d.rejected[0].requested}” is not in NASA's data` : "No material named yet", status: "done" });
  const o2 = d.fields["cabin.x_o2"];
  if (o2) out.push({ id: "atm", label: `Atmosphere: ${o2.note}`, status: "done" });
  if (d.missing.length) out.push({ id: "gaps", label: `${d.missing.length} thing${d.missing.length === 1 ? "" : "s"} still to ask`, status: "done" });
  return out;
}

export function AiInterview() {
  const { open, seed, set: setAi } = useAi();
  const reduce = useReducedMotion();
  const [step, setStep] = useState<"prompt" | "ask" | "review">("prompt");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [qs, setQs] = useState<Question[]>([]);
  const [qi, setQi] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [draft, setDraft] = useState<BuiltDraft | null>(null);
  const [offline, setOffline] = useState(false);
  const [trail, setTrail] = useState<Trail[]>([]);
  const [other, setOther] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    const on = (e: Event) => setAi({ open: true, seed: (e as CustomEvent<string>).detail ?? "" });
    window.addEventListener(BUILD_AI_EVENT, on);
    if (new URLSearchParams(window.location.search).get("build") === "1") setAi({ open: true });
    return () => window.removeEventListener(BUILD_AI_EVENT, on);
  }, [setAi]);
  useEffect(() => { if (open && seed) { setText(seed); setAi({ seed: "" }); } }, [open, seed, setAi]);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  });

  function close() { setAi({ open: false }); setStep("prompt"); setQi(0); setErr(null); setTrail([]); setConfirmed(false); setOther(null); }

  async function start(t = text) {
    setBusy(true); setErr(null);
    setTrail([{ id: "read", label: "Reading your description…", status: "active" }]);
    try {
      const p = await post({ mode: "parse", text: t });
      setTrail([...parseSteps(p.draft), { id: "q", label: "Choosing follow-up questions…", status: "active" }]);
      const f = await post({ mode: "followups", text: t, answers: p.draft.answers });
      setTrail([...parseSteps(p.draft), { id: "q", label: f.questions.length ? `${f.questions.length} question${f.questions.length === 1 ? "" : "s"} ${f.offline ? "(fixed set, offline)" : "chosen by the SI"}` : "Nothing left to ask", status: "done" }]);
      setDraft(p.draft); setAnswers(p.draft.answers); setOffline(!!p.offline || !!f.offline); setQs(f.questions); setQi(0);
      setStep(f.questions.length ? "ask" : "review");
    } catch (e) { setErr(String((e as Error).message ?? e)); setTrail([]); } finally { setBusy(false); }
  }
  async function answer(q: Question, v: string) {
    const next = { ...answers, [q.id]: v } as Answers;
    setAnswers(next); setOther(null);
    try { if (draft) setDraft(refine(draft, next, offline)); } catch (e) { console.error("refine failed", e); }
    if (qi + 1 < qs.length) setQi(qi + 1); else setStep("review");
  }
  async function answerOther(q: Question, words: string) {
    // "Other…": the words join the description and are parsed again; the question stays answered by what they say.
    const t = `${text}. ${words}`;
    setText(t); setOther(null);
    try { const p = await post({ mode: "parse", text: t, answers }); setDraft(p.draft); setAnswers({ ...p.draft.answers, [q.id]: p.draft.answers[q.id] ?? (q.id === "ignition" ? "item" : null) } as Answers); } catch { /* ignore */ }
    if (qi + 1 < qs.length) setQi(qi + 1); else setStep("review");
  }
  async function ignite() {
    setBusy(true);
    try {
      const fin = await post({ mode: "finalize", text, answers });
      const d: BuiltDraft = fin.draft;
      setAi({ open: false, rejected: d.rejected, offline: !!fin.offline });
      setStep("prompt"); setQi(0); setTrail([]); setConfirmed(false);
      if (d.scenario) await igniteScenario(d.scenario);
    } catch (e) { setErr(String((e as Error).message ?? e)); } finally { setBusy(false); }
  }
  const sc = draft?.scenario;
  const assumptions = draft ? Object.entries(draft.fields).filter(([, f]) => f.source === "assumption") : [];
  const dots = ["prompt", ...qs.map((q) => q.id), "review"];
  const at = step === "prompt" ? 0 : step === "ask" ? qi + 1 : qs.length + 1;
  return (
    <AnimatePresence>
      {open && <motion.div key="ai-interview" className="fixed inset-0 z-50 grid place-items-center bg-bg/55 p-4 backdrop-blur-xl" role="dialog" aria-modal="true" aria-label="Build with SI" data-testid="ai-interview"
        initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.28 } }}>
        <div className="ai-screen-edge" data-on={busy} aria-hidden data-testid="ai-screen-edge" />
        <motion.div layoutId="ai-sheet" className="w-full max-w-3xl" initial={reduce ? false : { scale: 0.96, y: 12 }} animate={{ scale: 1, y: 0 }} exit={reduce ? { opacity: 0 } : { scale: 0.7, y: 90, opacity: 0, transition: { duration: 0.28, ease: [0.4, 0, 1, 1] } }} transition={{ type: "spring", stiffness: 260, damping: 28 }}>
          <AiGlow thinking={busy} className="rounded-[22px]">
            <div className="grid gap-6 p-2 md:grid-cols-[1fr_240px]">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="flex items-center gap-2 text-[15px] font-semibold tracking-[-0.01em]"><Orb state={busy ? "thinking" : offline ? "offline" : "speaking"} size={16} />SI fire engineer</h2>
                  <div className="flex items-center gap-2"><OfflineChip on={offline} /><button type="button" className="grid h-7 w-7 place-items-center rounded-full text-faint transition-colors hover:bg-surface2 hover:text-ink" aria-label="Close" onClick={close}>✕</button></div>
                </div>
                <div className="ai-steps" aria-label={`Step ${at + 1} of ${dots.length}`} data-testid="ai-progress">{dots.map((k, i) => <span key={k + i} data-done={i <= at} />)}</div>
                <ThinkingTrail steps={trail} />
                {step === "prompt" && <>
                  <label htmlFor="ai-prompt" className="block text-[20px] font-semibold tracking-[-0.015em]">Describe the spacecraft and what might catch fire.</label>
                  <textarea id="ai-prompt" rows={3} className="ai-field" autoFocus value={text} onChange={(e) => setText(e.target.value)} data-testid="ai-prompt" placeholder="e.g. Moon base at 34% oxygen, a SIBAL curtain near an overheated wire" />
                  <div className="flex flex-wrap gap-1.5">{EXAMPLES.map(([l, t]) => <button key={l} type="button" className="ai-chip" onClick={() => setText(t)}>{l}</button>)}</div>
                  <button type="button" className="ai-primary" disabled={busy || text.trim().length < 3} onClick={() => void start()} data-testid="ai-next">{busy ? "Reading…" : "Continue"}</button>
                </>}
                {step === "ask" && qs[qi] && <motion.div key={qs[qi].id} className="space-y-3" data-testid="ai-question" initial={reduce ? false : { opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}>
                  <p className="text-[20px] font-semibold tracking-[-0.015em]">{qs[qi].question}</p>
                  <div className="flex flex-wrap gap-1.5">{qs[qi].options.map((o) => <button key={o.value} type="button" className="ai-chip" data-testid="ai-option" onClick={() => void answer(qs[qi], o.value)}>
                    {o.label}{o.badge && <span className="ai-chip__badge" data-tone={o.badge === "NASA-tested" ? "ok" : undefined}>{o.badge}</span>}</button>)}
                    {qs[qi].allowOther && other === null && <button type="button" className="ai-chip text-mute" onClick={() => setOther("")}>Other…</button>}</div>
                  {other !== null && <Composer value={other} onChange={setOther} onSubmit={() => void answerOther(qs[qi], other.trim())} placeholder="Say it in your own words…" label="Other answer" />}
                </motion.div>}
                {step === "review" && draft && <div className="space-y-2" data-testid="ai-review">
                  <p className="text-[20px] font-semibold tracking-[-0.015em]">Ready to ignite?</p><p className="text-[13px] text-mute">Every field and where it came from.</p>
                  <ul className="max-h-52 divide-y divide-line/60 overflow-auto rounded-xl border border-line/70 text-[12px]">{Object.entries(draft.fields).map(([k, f]) => <li key={k} className="flex items-baseline gap-2 px-3 py-1.5"><span className={`w-24 shrink-0 ${TONE[f.source]}`}>{SRC[f.source]}</span><span className="text-mute">{f.note}</span></li>)}</ul>
                  {draft.rejected.map((r, i) => <p key={i} className="text-[12px] text-warn">✕ {r.reason}</p>)}
                  {draft.notes.map((n, i) => <p key={i} className="text-[12px] text-mute">• {n}</p>)}
                  {assumptions.length > 0 && <label className="flex items-center gap-2 text-[13px] text-warn"><input type="checkbox" className="accent-[rgb(var(--ember))]" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} data-testid="ai-confirm" />I confirm the {assumptions.length} SI assumption{assumptions.length === 1 ? "" : "s"} (edit them after in the setup panel)</label>}
                  <div className="flex gap-2">
                    <button type="button" className="ai-primary" disabled={busy || (assumptions.length > 0 && !confirmed)} onClick={() => void ignite()} data-testid="ai-ignite">Ignite simulation</button>
                    <button type="button" className="ai-chip" onClick={() => { setStep("prompt"); setTrail([]); }}>Edit description</button>
                  </div>
                </div>}
                {err && <p className="text-[13px] text-warn" role="alert">{err}</p>}
              </div>
              <aside className="space-y-3 rounded-2xl bg-bg/35 p-3.5 text-[12px] ring-1 ring-inset ring-line/60" aria-label="Live draft" data-testid="ai-schematic">
                <p className="ai-label">Live draft</p>
                {sc ? <>
                  <div className="flex flex-wrap gap-1">{([["cabin.x_o2", `O₂ ${(sc.cabin.x_o2 * 100).toFixed(1)} %`], ["cabin.P_Pa", `${(sc.cabin.P_Pa / 1e3).toFixed(1)} kPa`], ["cabin.gravity_g", `${sc.cabin.gravity_g} g`]] as const).map(([k, l]) =>
                    <motion.span key={k + l} initial={reduce ? false : { opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} title={draft?.fields[k] ? `${SRC[draft.fields[k].source]}: ${draft.fields[k].note}` : undefined}
                      className={`num rounded-full border px-2 py-0.5 ${draft?.fields[k]?.source === "assumption" ? "border-warn/50 text-warn" : "border-line text-ink"}`}>{l}</motion.span>)}</div>
                  <div className="relative h-28 overflow-hidden rounded-xl bg-bg/60 ring-1 ring-inset ring-line/60">
                    <div className="absolute inset-x-3 bottom-3 top-3 rounded-[40px] border border-line/70" aria-hidden />
                    <AnimatePresence>{sc.items.map((it, i) => <motion.span key={it.id} layout className="absolute rounded-full border border-line bg-panel/80 px-2 py-0.5 backdrop-blur" style={{ left: 16 + (i % 2) * 104, top: 26 + Math.floor(i / 2) * 30 }}
                      initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                      {materialByKey(it.material_key)?.display_name ?? it.material_key}{it.ignite && <span className="relative ml-1.5 inline-flex h-2 w-2 align-middle" aria-label="ignition point"><span className="absolute inset-0 animate-ping rounded-full bg-ember/70 motion-reduce:animate-none" /><span className="relative h-2 w-2 rounded-full bg-ember" /></span>}</motion.span>)}</AnimatePresence>
                    {!sc.items.length && <span className="absolute inset-0 grid place-items-center text-faint">no items yet</span>}
                  </div>
                  <p className="flex flex-wrap gap-x-2.5 gap-y-1 text-faint"><span><span className="text-ok">●</span> NASA-cited</span><span><span className="text-blue">●</span> you said</span><span><span className="text-warn">●</span> assumption</span></p>
                </> : <p className="text-faint">Fills in as you answer.</p>}
              </aside>
            </div>
          </AiGlow>
        </motion.div>
      </motion.div>}
    </AnimatePresence>
  );
}

/** Calm empty state over a dimmed cabin when the run has no flame, with a one-click fix. */
export function NoFireCard() {
  const { a, ra, running } = useSim();
  const rejected = useAi((s) => s.rejected);
  const reduce = useReducedMotion();
  if (!a || running) return null;
  const hasRun = !!ra;
  const nf = noFireReason(a, ra, rejected);
  if (!nf || (!hasRun && (nf.reason === "no_ignition" || nf.reason === "too_little_oxygen"))) return null;
  return (
    <div className="absolute inset-0 z-20 grid place-items-center bg-bg/60 backdrop-grayscale" data-testid="no-fire">
      <motion.div className="glass max-w-sm space-y-2.5 rounded-[20px] p-5" initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-[17px] font-semibold tracking-[-0.01em]" data-testid="no-fire-title"><span className="text-mute">✕</span> {nf.title}</p>
        <p className="text-[13px] text-mute">{nf.detail}</p>
        {nf.fix && <button type="button" className="ai-primary" data-testid="no-fire-fix" onClick={() => { useAi.getState().set({ rejected: [] }); void igniteScenario(applyNoFireFix(a, nf.fix!)); }}>{nf.fix.label}</button>}
      </motion.div>
    </div>
  );
}
