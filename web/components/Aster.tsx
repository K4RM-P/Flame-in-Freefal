"use client";

import { usePathname } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import type { answerLocally } from "@/lib/ai/localAster";

type LocalAnswer = ReturnType<typeof answerLocally>;
type Mode = "catalog" | "openai";
type Exchange = { mode?: Mode; question: string; answer?: string; sources?: LocalAnswer["sources"]; error?: string };

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

export function Aster() {
  const path = usePathname().replace(/(.)\/$/, "$1");
  const guide = guides[path];
  const dialog = useRef<HTMLDialogElement>(null);
  const launcher = useRef<HTMLButtonElement>(null);
  const transcript = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState("");
  const [thread, setThread] = useState<Exchange[]>([]);
  const [busy, setBusy] = useState(false);

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
        body: JSON.stringify({ question, path: window.location.pathname, context: document.body.innerText.slice(0, 12000) }),
      });
      const result = await response.json() as Partial<LocalAnswer> & { mode?: Mode; error?: string };
      exchange = response.ok && result.answer
        ? { question, answer: result.answer, sources: result.sources, mode: result.mode }
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
          <div ref={transcript} role="log" aria-label="Aster conversation" className="min-h-0 flex-1 space-y-4 overflow-auto break-words p-4 text-sm">
            {guide && <div className="space-y-2 rounded-md border border-line bg-panel p-3">
              <p className="label">{guide.title} guide</p>
              <p className="text-mute">{guide.tip}</p>
              <button type="button" className="btn text-left" onClick={() => setDraft(guide.question)}>{guide.question}</button>
            </div>}
            {!guide && thread.length === 0 && <p className="text-mute">Ask about a NASA fire experiment. Aster searches EmberAtlas’s bundled study catalog.</p>}
            {thread.map(({ question, answer, error, sources, mode }, index) => (
              <div key={index} className="space-y-2">
                <p className="rounded-md border border-line bg-bg p-3"><span className="ea-meta mr-1">You</span> · {question}</p>
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
            <input className="min-w-0 flex-1" aria-label="Question for Aster" placeholder="Ask about the research…" value={draft}
              maxLength={800} onChange={(event) => setDraft(event.target.value)} />
            <button className="btn-accent" disabled={busy || !draft.trim()}>Send</button>
          </form>
        </div>
      </dialog>
    </div>
  );
}
