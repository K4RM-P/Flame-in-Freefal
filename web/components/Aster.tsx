"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { asterDestinations, navigationRequest, type AsterDestination } from "@/lib/ai/asterNavigation";
import { ASTER_CONTEXT_EVENT, type AsterContext } from "@/lib/ai/asterContext";
import type { answerLocally } from "@/lib/ai/localAster";
import { emptyRun, readEvents, reduceRun, type AiRun } from "@/lib/ai/stream";
import { AiGlow, Cites, GuardBadge, OfflineChip, Orb, StreamAnswer, ThinkingTrail, orbOf } from "@/components/ai/kit";
import { ThinkingOrb } from "@/components/ai/ThinkingOrb";
import { BUILD_AI_EVENT } from "@/components/sim/AiInterview";

type LocalAnswer = ReturnType<typeof answerLocally>;
type Mode = "catalog" | "openai";
type Exchange = { contextLabel?: string; destination?: AsterDestination; mode?: Mode; question: string; answer?: string; sources?: LocalAnswer["sources"]; error?: string; run?: AiRun };
const PRESET_LINKS: [string, string][] = [["lunar-design-review", "Moon base: find the gaps"], ["iss-vs-lunar", "ISS vs Moon base"], ["saffire-replay", "Saffire-III replay"]];

const guides: Record<string, { title: string; tip: string; question: string }> = {
  "/": { title: "Overview", tip: "Start with the Earth-versus-orbit comparison to see a real NASA experiment, then try a cabin scenario.", question: "What was FLEX?" },
  "/evidence": { title: "Evidence", tip: "Compare the Saffire-II outcomes, then check whether your cabin conditions fall within the tested ranges.", question: "What did Saffire-II test?" },
  "/simulator": { title: "Simulator", tip: "Choose a scenario, review its inputs, then run it. Open the inspector to see results and their sources.", question: "What did Saffire-III study?" },
  "/methods": { title: "Methods", tip: "Choose a model and open a formula card. The validation table shows how predictions compared with published or held-out results.", question: "What did FLEX measure?" },
  "/about": { title: "About", tip: "Find the team and see how the research tools and scenario builder were put together.", question: "What does the NASA FLEX study cover?" },
};


import { useLanguage } from "@/components/shell/Language";

function SourcePreviews({ sources }: { sources?: LocalAnswer["sources"] }) {
  if (!sources?.length) return null;
  return (
    <details className="rounded-[14px] border border-line/70 bg-bg/40" data-testid="aster-sources">
      <summary className="cursor-pointer rounded-[14px] px-3 py-2 text-sm font-medium text-mute hover:text-ink">
        Sources <span className="num">({sources.length})</span>
      </summary>
      <div className="divide-y divide-line/70 border-t border-line/70">
        {sources.map((study) => (
          <article key={study.id} className="p-3">
            <p className="num text-xs text-mute">{study.id}</p>
            <a className="font-medium underline underline-offset-2" href={study.url} target="_blank" rel="noreferrer">{study.title}</a>
            <p className="mt-1 text-mute">{study.excerpt}{study.excerpt.length === 420 ? "…" : ""}</p>
          </article>
        ))}
      </div>
    </details>
  );
}

export function Aster() {
  const { language } = useLanguage();
  const path = usePathname().replace(/(.)\/$/, "$1");
  const guide = guides[path];
  const next = ({
    "/": asterDestinations.orbit,
    "/evidence": asterDestinations.simulator,
    "/simulator": asterDestinations.methods,
    "/methods": asterDestinations.validation,
    "/about": asterDestinations.team,
  } as Record<string, AsterDestination>)[path];
  const dialog = useRef<HTMLDialogElement>(null);
  const launcher = useRef<HTMLButtonElement>(null);
  const transcript = useRef<HTMLDivElement>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [thread, setThread] = useState<Exchange[]>([]);
  const [busy, setBusy] = useState(false);
  const [context, setContext] = useState<AsterContext | null>(null);

  function openChat() {
    if (!dialog.current || dialog.current.open) return;
    dialog.current.showModal();
    setChatOpen(true);
  }

  useEffect(() => {
    function openContext(event: Event) {
      const selected = (event as CustomEvent<AsterContext>).detail;
      setContext(selected);
      setDraft(selected.question);
      openChat();
    }
    window.addEventListener(ASTER_CONTEXT_EVENT, openContext);
    return () => window.removeEventListener(ASTER_CONTEXT_EVENT, openContext);
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const question = draft.trim();
    if (!question || busy) return;
    setDraft("");
    const destination = navigationRequest(question);
    if (destination) {
      setThread((current) => [...current, { question, destination }]);
      scrollTranscript();
      return;
    }

    setBusy(true);
    const idx = thread.length;
    let run = emptyRun();
    const base: Exchange = { question, contextLabel: context?.label, run };
    setThread((current) => [...current, base]);
    const put = (r: AiRun) => setThread((current) => current.map((x, i) => (i === idx ? { ...x, run: r } : x)));
    try {
      const response = await fetch("/api/aster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stream: true, question, path, language, context: context ?? document.body.innerText.slice(0, 12000) }),
      });
      await readEvents(response, (e) => { run = reduceRun(run, e); put(run); scrollTranscript(); });
      if (run.streaming) { run = reduceRun(run, { type: "done", data: { text: run.text } }); put(run); }
    } catch {
      run = reduceRun(run, { type: "error", error: "Aster couldn’t connect. Please try again." }); put(run);
    }
    setBusy(false);
    scrollTranscript();
  }

  /** Launch the AI interview: in place on the simulator, otherwise via /simulator?build=1. */
  function buildScenario() {
    dialog.current?.close();
    if (path === "/simulator") window.dispatchEvent(new CustomEvent(BUILD_AI_EVENT, { detail: "" }));
    else window.location.href = "/simulator?build=1";
  }

  function scrollTranscript() {
    requestAnimationFrame(() => {
      if (transcript.current) transcript.current.scrollTop = transcript.current.scrollHeight;
    });
  }

  return (
    <div data-noprint>
      <button ref={launcher} type="button" className="ea-aster-launcher" aria-label="Ask Aster"
        aria-haspopup="dialog" aria-controls="aster-dialog" onClick={openChat}>
        <span className="ea-aster-launcher__icon"><Orb state={busy ? "thinking" : "speaking"} size={14} /></span><span>Ask Aster</span>
      </button>
      <dialog id="aster-dialog" ref={dialog} aria-labelledby="aster-title" onClose={() => { setChatOpen(false); launcher.current?.focus(); }}
        className="ea-aster-dialog glass fixed inset-y-0 left-auto right-0 m-0 h-[100dvh] max-h-none w-full max-w-none overflow-hidden border-0 border-l p-0 text-ink backdrop:bg-black/40 backdrop:backdrop-blur-sm sm:w-[28rem]">
        <div className="flex h-full flex-col">
          <header className="flex items-center justify-between gap-3 border-b border-line p-4">
            <h2 id="aster-title" className="flex items-center gap-2 text-[15px] font-semibold tracking-tight"><Orb state={busy ? "thinking" : thread.at(-1)?.run?.done?.offline ? "offline" : "speaking"} size={38} interactive={chatOpen} /> Aster <span className="text-[12px] font-normal text-faint">NASA research</span></h2>
            <button type="button" className="grid h-7 w-7 place-items-center rounded-full text-faint transition-colors hover:bg-surface2 hover:text-ink" aria-label="Close" autoFocus onClick={() => dialog.current?.close()}>✕</button>
          </header>
          {context && <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-2 text-sm">
            <span className="min-w-0 break-words"><strong>Context:</strong> {context.label}</span>
            <button className="btn shrink-0" type="button" onClick={() => setContext(null)}>Clear</button>
          </div>}
          <div ref={transcript} role="log" aria-label="Aster conversation" className="min-h-0 flex-1 space-y-4 overflow-auto break-words p-4 text-sm">
            {guide && <div className="space-y-2 rounded-md border border-line bg-panel p-3">
              <p className="label">{guide.title} guide</p>
              <p className="text-mute">{guide.tip}</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn text-left" onClick={() => setDraft(guide.question)}>{guide.question}</button>
                {next && <Link className="btn" href={next.href} onClick={() => dialog.current?.close()}>Open {next.label} →</Link>}
              </div>
            </div>}
            <div className="glass space-y-2.5 rounded-[18px] p-3.5" data-testid="aster-launch">
              <p className="ai-label">Simulate it</p>
              <button type="button" className="ai-cta" data-testid="aster-build" onClick={buildScenario}><span className="ai-star" aria-hidden>✦</span>Build this scenario</button>
              <div className="flex flex-wrap gap-1.5">{PRESET_LINKS.map(([id, label]) => <a key={id} className="ai-chip !py-1 !text-[12px]" href={`/simulator?preset=${id}`}>{label}</a>)}</div>
            </div>
            {!guide && thread.length === 0 && <p className="text-mute">Ask about a NASA fire experiment. Aster searches EmberAtlas’s bundled study catalog.</p>}
            {thread.map(({ question, error, destination, contextLabel, run }, index) => (
              <div key={index} className="space-y-2">
                <p className="ml-auto w-fit max-w-[85%] rounded-[18px] rounded-br-md bg-ember/15 px-3.5 py-2"><span data-no-translate>{question}</span>{contextLabel && <span className="block text-xs text-mute">{contextLabel}</span>}</p>
                {destination && <div className="space-y-2">
                  <p className="text-mute">Ready to open {destination.label}.</p>
                  <Link className="btn-accent" href={destination.href} onClick={() => dialog.current?.close()}>Open {destination.label} →</Link>
                </div>}
                {error && <p className="text-warn">{error}</p>}
                {run && <AiGlow thinking={run.streaming}>
                  <div className="mb-1.5 flex items-center gap-2"><Orb state={orbOf(run)} size={12} /><p className="ai-label flex-1" role="status">{run.streaming ? "Thinking…" : run.error ? "Aster" : run.done?.mode === "openai" ? "AI answer" : "Catalog search"}</p><OfflineChip on={!!run.done?.offline} /></div>
                  <ThinkingOrb run={run} />
                  <ThinkingTrail steps={run.steps} />
                  {(!run.streaming || run.text) && <div className="mt-1.5"><StreamAnswer run={run} /></div>}
                  {!run.streaming && !run.error && <div className="mt-1.5 space-y-1.5"><Cites ids={run.done?.citations as string[] | undefined} /><GuardBadge ok={(run.done?.guard as { ok?: boolean } | undefined)?.ok !== false} /></div>}
                </AiGlow>}
                <SourcePreviews sources={run?.done?.sources as LocalAnswer["sources"] | undefined} />
              </div>
            ))}
          </div>
          <div className="p-3 pb-[max(.75rem,env(safe-area-inset-bottom))]">
            <form onSubmit={submit} className="ai-composer">
              <input aria-label="Question for Aster" placeholder="Ask about NASA research, or “open Methods”" value={draft} maxLength={800} onChange={(event) => setDraft(event.target.value)} />
              <button type="submit" className="ai-send" aria-label="Send" disabled={busy || !draft.trim()}>
                {busy ? <span className="ai-arc" style={{ width: 14, height: 14 }} /> : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 19V5M5 12l7-7 7 7" /></svg>}
              </button>
            </form>
          </div>
        </div>
      </dialog>
    </div>
  );
}
