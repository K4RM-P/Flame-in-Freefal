// SI-assisted: written with Codex (OpenAI); see README "Use of AI (SI)".
"use client";

import { useRef } from "react";
import { AskPanel } from "./AskPanel";

export function Aster() {
  const dialog = useRef<HTMLDialogElement>(null);
  const launcher = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button ref={launcher} type="button" className="btn fixed bottom-4 right-4 z-40 bg-surface2 shadow-lg"
        aria-haspopup="dialog" aria-controls="aster-dialog" onClick={() => dialog.current?.showModal()}>
        <span aria-hidden="true">✦</span> Ask Aster
      </button>
      <dialog id="aster-dialog" ref={dialog} aria-labelledby="aster-title" onClose={() => launcher.current?.focus()}
        className="fixed inset-auto bottom-4 right-4 m-0 w-[min(30rem,calc(100vw-2rem))] max-h-[85dvh] overflow-auto rounded-lg border border-line bg-surface2 p-4 text-ink shadow-xl backdrop:bg-black/40">
        <div className="mb-3 flex items-center justify-between gap-3 border-b border-line pb-3">
          <h2 id="aster-title" className="text-xl font-semibold"><span aria-hidden="true">✦ </span>Aster</h2>
          <button type="button" className="btn" onClick={() => dialog.current?.close()}>Close</button>
        </div>
        <AskPanel />
      </dialog>
    </>
  );
}
