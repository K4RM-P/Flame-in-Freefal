"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { asterDestinations, navigationRequest, type AsterDestination } from "@/lib/ai/asterNavigation";
import { ASTER_CONTEXT_EVENT, type AsterContext } from "@/lib/ai/asterContext";
import type { answerLocally } from "@/lib/ai/localAster";

type LocalAnswer = ReturnType<typeof answerLocally>;
type Mode = "catalog" | "openai";
type Exchange = { contextLabel?: string; destination?: AsterDestination; mode?: Mode; question: string; answer?: string; sources?: LocalAnswer["sources"]; error?: string };

const guides: Record<string, { title: string; tip: string; question: string }> = {
  "/": { title: "Overview", tip: "Start with the Earth-versus-orbit comparison to see a real NASA experiment, then try a cabin scenario.", question: "What was FLEX?" },
  "/evidence": { title: "Evidence", tip: "Compare the Saffire-II outcomes, then check whether your cabin conditions fall within the tested ranges.", question: "What did Saffire-II test?" },
  "/simulator": { title: "Simulator", tip: "Choose a scenario, review its inputs, then run it. Open the inspector to see results and their sources.", question: "What did Saffire-III study?" },
  "/methods": { title: "Methods", tip: "Choose a model and open a formula card. The validation table shows how predictions compared with published or held-out results.", question: "What did FLEX measure?" },
  "/about": { title: "About", tip: "Find the team and see how the research tools and scenario builder were put together.", question: "What does the NASA FLEX study cover?" },
};

function OrbitStar() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <ellipse cx="12" cy="12" rx="10" ry="4.5" transform="rotate(-35 12 12)" />
      <path d="M12 6l1.4 4.6L18 12l-4.6 1.4L12 18l-1.4-4.6L6 12l4.6-1.4L12 6Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

import { useLanguage } from "@/components/shell/Language";

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
  const [draft, setDraft] = useState("");
  const [thread, setThread] = useState<Exchange[]>([]);
  const [busy, setBusy] = useState(false);
  const [context, setContext] = useState<AsterContext | null>(null);

  useEffect(() => {
    function openContext(event: Event) {
      const selected = (event as CustomEvent<AsterContext>).detail;
      setContext(selected);
      setDraft(selected.question);
      if (dialog.current && !dialog.current.open) dialog.current.showModal();
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

    let exchange: Exchange;
    try {
      const response = await fetch("/api/aster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, path, language, context: context ?? document.body.innerText.slice(0, 12000) }),
      });
      const result = await response.json() as Partial<LocalAnswer> & { mode?: Mode; error?: string };
      exchange = response.ok && result.answer
        ? { question, answer: result.answer, sources: result.sources, mode: result.mode }
        : { question, error: result.error ?? "Aster could not answer. Please try again." };
    } catch {
      exchange = { question, error: "Aster couldn’t connect. Please try again." };
    }
    setThread((current) => [...current, { ...exchange, contextLabel: context?.label }]);
    setBusy(false);
    scrollTranscript();
  }

  function scrollTranscript() {
    requestAnimationFrame(() => {
      if (transcript.current) transcript.current.scrollTop = transcript.current.scrollHeight;
    });
  }

  return (
    <div data-noprint>
      <button ref={launcher} type="button" className="ea-aster-launcher" data-compact={path === "/simulator" || undefined} aria-label="Ask Aster"
        aria-haspopup="dialog" aria-controls="aster-dialog" onClick={() => dialog.current?.showModal()}>
        <span className="ea-aster-launcher__icon"><OrbitStar /></span><span>Ask Aster</span><span className="ea-aster-launcher__dot" aria-hidden />
      </button>
      <dialog id="aster-dialog" ref={dialog} aria-labelledby="aster-title" onClose={() => launcher.current?.focus()}
        className="ea-aster-dialog fixed inset-y-0 left-auto right-0 m-0 h-[100dvh] max-h-none w-full max-w-none overflow-hidden border-0 border-l border-line bg-panel p-0 text-ink backdrop:bg-black/50 sm:w-[28rem]">
        <div className="flex h-full flex-col">
          <header className="flex items-center justify-between gap-3 border-b border-line p-4">
            <h2 id="aster-title" className="flex items-center gap-2 text-[15px] font-semibold tracking-tight"><OrbitStar /> Aster <span className="ea-pill">NASA research</span></h2>
            <button type="button" className="btn" autoFocus onClick={() => dialog.current?.close()}>Close</button>
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
            {!guide && thread.length === 0 && <p className="text-mute">Ask about a NASA fire experiment. Aster searches EmberAtlas’s bundled study catalog.</p>}
            {thread.map(({ question, answer, error, sources, mode, destination, contextLabel }, index) => (
              <div key={index} className="space-y-2">
                <p className="rounded-md border border-line bg-bg p-3"><strong>You</strong> · <span data-no-translate>{question}</span>{contextLabel && <span className="block text-xs text-mute">{contextLabel}</span>}</p>
                {destination && <div className="space-y-2">
                  <p className="text-mute">Ready to open {destination.label}.</p>
                  <Link className="btn-accent" href={destination.href} onClick={() => dialog.current?.close()}>Open {destination.label} →</Link>
                </div>}
                {error && <p className="text-warn">{error}</p>}
                {answer && <div className="space-y-1">
                  <p className="label">{mode === "openai" ? "OpenAI summary" : "Catalog search"}</p>
                  <p className="whitespace-pre-line leading-relaxed">{answer}</p>
                </div>}
                {sources?.map((study) => (
                  <article key={study.id} className="rounded-md border border-line p-3">
                    <p className="num text-xs text-mute">{study.id}</p>
                    <a className="font-medium underline underline-offset-2" href={study.url} target="_blank" rel="noreferrer">{study.title}</a>
                    <p className="mt-1 text-mute">{study.excerpt}{study.excerpt.length === 420 ? "…" : ""}</p>
                  </article>
                ))}
              </div>
            ))}
            {busy && <p className="text-mute" role="status">Checking the research…</p>}
          </div>
          <form onSubmit={submit} className="flex gap-2 border-t border-line p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <input className="min-w-0 flex-1" aria-label="Question for Aster" placeholder="Ask about research or say ‘open Methods’…" value={draft}
              maxLength={800} onChange={(event) => setDraft(event.target.value)} />
            <button className="btn-accent" disabled={busy || !draft.trim()}>Send</button>
          </form>
        </div>
      </dialog>
    </div>
  );
}
