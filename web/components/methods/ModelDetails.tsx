"use client";
import { useEffect, useState } from "react";
import { ModelPage } from "./ModelPage";

/** One model, one click deep. Rendered only when opened; opens itself when the URL hash is #model-<id>. */
export function ModelDetails({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const sync = () => { if (window.location.hash === `#model-${id}`) setOpen(true); };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [id]);
  return (
    <details id={`model-${id}`} open={open} onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)} className="scroll-mt-20 border-t border-line pt-2">
      <summary className="cursor-pointer text-[14px] font-medium">{id}</summary>
      {open && <div className="pt-3"><ModelPage id={id} /></div>}
    </details>
  );
}
