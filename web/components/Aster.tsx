"use client";
// SI-assisted: written with Codex (OpenAI); see README "Use of AI (SI)".

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import type { answerLocally } from "@/lib/ai/localAster";
import { useAsterGuide, type Guide } from "@/lib/asterGuides";

type LocalAnswer = ReturnType<typeof answerLocally>;
type Exchange = { question: string; answer?: string; sources?: LocalAnswer["sources"]; error?: string; guide?: Guide };

function OrbitStar() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <ellipse cx="12" cy="12" rx="10" ry="4.5" transform="rotate(-35 12 12)" />
      <path d="M12 6l1.4 4.6L18 12l-4.6 1.4L12 18l-1.4-4.6L6 12l4.6-1.4L12 6Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function Aster() {
  const dialog = useRef<HTMLDialogElement>(null);
  const launcher = useRef<HTMLButtonElement>(null);
  const transcript = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState("");
  const [thread, setThread] = useState<Exchange[]>([]);
  const [busy, setBusy] = useState(false);
  const request = useAsterGuide((s) => s.request);

  // A page's "✦ Ask Aster about this page" button: add that page's guide (static, local) and open the chat.
  useEffect(() => {
    if (!request) return;
    const { guide } = request;
    setThread((current) => [...current, { question: `About this page: ${guide.title}`, guide }]);
    if (!dialog.current?.open) dialog.current?.showModal();
    requestAnimationFrame(() => { if (transcript.current) transcript.current.scrollTop = transcript.current.scrollHeight; });
  }, [request]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const question = draft.trim();
    if (!question || busy) return;
    setDraft("");
    setBusy(true);

    let exchange: Exchange;
    try {
      const response = await fetch("/api/aster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const result = await response.json() as Partial<LocalAnswer> & { error?: string };
      exchange = response.ok && result.answer
        ? { question, answer: result.answer, sources: result.sources }
        : { question, error: result.error ?? "Aster could not answer. Please try again." };
    } catch {
      exchange = { question, error: "Aster couldn’t connect. Please try again." };
    }
    setThread((current) => [...current, exchange]);
    setBusy(false);
    requestAnimationFrame(() => {
      if (transcript.current) transcript.current.scrollTop = transcript.current.scrollHeight;
    });
  }

  return (
    <div data-noprint>
      <button ref={launcher} type="button" className="btn fixed bottom-4 right-4 z-40 inline-flex items-center gap-2 bg-surface2 shadow-lg"
        aria-haspopup="dialog" aria-controls="aster-dialog" onClick={() => dialog.current?.showModal()}>
        <OrbitStar /> Ask Aster
      </button>
      <dialog id="aster-dialog" ref={dialog} aria-labelledby="aster-title" onClose={() => launcher.current?.focus()}
        className="aster-dialog fixed inset-auto bottom-0 right-0 m-0 w-full max-w-none overflow-hidden rounded-t-xl border border-line bg-surface2 p-0 text-ink shadow-xl backdrop:bg-black/30 sm:bottom-4 sm:right-4 sm:w-[30rem] sm:rounded-xl">
        <div className="flex h-[min(35rem,85dvh)] flex-col">
          <header className="flex items-center justify-between gap-3 border-b border-line p-4">
            <h2 id="aster-title" className="flex items-center gap-2 text-lg font-semibold"><OrbitStar /> Aster <span className="chip border border-line text-mute">Local research</span></h2>
            <button type="button" className="btn" autoFocus onClick={() => dialog.current?.close()}>Close</button>
          </header>
          <div ref={transcript} role="log" aria-label="Aster conversation" className="min-h-0 flex-1 space-y-4 overflow-auto break-words p-4 text-sm">
            {thread.length === 0 && <p className="text-mute">Ask about a NASA fire experiment. Aster searches EmberAtlas’s bundled study catalog.</p>}
            {thread.map(({ question, answer, error, sources, guide }, index) => (
              <div key={index} className="space-y-2" data-testid={guide ? "aster-guide" : undefined}>
                <p className="rounded-md border border-line bg-bg p-3"><strong>You</strong> · {question}</p>
                {guide && <>
                  <p className="leading-relaxed">{guide.text}</p>
                  <p className="label text-[11px]">Next steps</p>
                  <ol className="space-y-1">
                    {guide.steps.map((step, i) => <li key={step.href}>
                      <Link className="flex items-baseline gap-2 rounded-md border border-line p-2 hover:bg-bg" href={step.href} onClick={() => dialog.current?.close()}>
                        <span className="num text-xs text-faint">{i + 1}</span><span className="underline underline-offset-2">{step.label}</span><span aria-hidden className="ml-auto text-faint">→</span>
                      </Link></li>)}
                  </ol>
                  <p className="text-xs text-faint">Page guide · written in EmberAtlas, no AI call.</p>
                </>}
                {error && <p className="text-warn">{error}</p>}
                {answer && <p className="leading-relaxed">{answer}</p>}
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
            <input className="min-w-0 flex-1" aria-label="Question for Aster" placeholder="Ask about the research…" value={draft}
              maxLength={800} onChange={(event) => setDraft(event.target.value)} />
            <button className="btn-accent" disabled={busy || !draft.trim()}>Send</button>
          </form>
        </div>
      </dialog>
    </div>
  );
}
