"use client";
// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// First-visit three-step hint (dismissible, remembered in localStorage inside try/catch) and the phone fallback.
import Link from "next/link";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { lsGet, lsSet } from "@/lib/store";

const KEY = "ea.simHint.v1";
const STEPS = [
  ["Pick a scenario", "Load “ISS vs Moon base”, “Moon base: find the gaps” or “Saffire-III replay”, or describe your own cabin with Build with SI."],
  ["Burn it", "Press ▶ Play (or R). The engine runs on NASA PSI data; out-of-envelope results carry an EXTRAPOLATED badge."],
  ["Ask and fix", "Open Ask Aster for the why, with citations, and the design review for ranked fixes you can re-run."],
] as const;

export function FirstRunHint() {
  const [show, setShow] = useState(false);
  useEffect(() => { setShow(!lsGet<boolean>(KEY, false)); }, []);
  if (!show) return null;
  const close = () => { lsSet(KEY, true); setShow(false); };
  return (
    <section aria-label="How to use the simulator" data-testid="first-run-hint" className="relative hidden rounded-[8px] border border-line bg-panel p-3 md:block" data-noprint>
      <button type="button" className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-md text-faint hover:bg-surface2 hover:text-ink" aria-label="Dismiss the simulator hint" onClick={close}><X size={14} strokeWidth={1.5} /></button>
      <ol className="grid gap-3 pr-8 md:grid-cols-3">
        {STEPS.map(([t, d], i) => <li key={t} className="text-[13px]"><span className="num text-[11px] text-faint">{String(i + 1).padStart(2, "0")}</span> <b>{t}.</b> <span className="text-mute">{d}</span></li>)}
      </ol>
    </section>
  );
}

/** Phones: a clean notice instead of a cramped 3D workspace; the visitor can still continue. */
export function PhoneNotice({ onContinue }: { onContinue: () => void }) {
  return (
    <section className="space-y-4 py-10 md:hidden" data-testid="phone-notice">
      <p className="label">Simulator</p>
      <h1 className="display text-3xl leading-[1.1]">Best on a desktop or tablet.</h1>
      <p className="text-mute">The 3D cabin, charts and design review need a wider screen. On a phone you can read the NASA evidence and the methods, or open the simulator anyway.</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-accent" onClick={onContinue}>Open the simulator anyway</button>
        <Link className="btn" href="/evidence">NASA evidence</Link>
        <Link className="btn" href="/methods">Methods</Link>
      </div>
    </section>
  );
}
