"use client";
// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
import { useState } from "react";
import { bandSig, fmtBand, sig } from "@/lib/ui/format";
import type { Band, Provenance } from "@/lib/sim/types";
import { useSim } from "./store";

/** A result number: always a button that opens its receipt (provenance). */
export function Num({ value, units, band, title, sources, note, className = "" }: {
  value: number | null | undefined; units: string; band?: Band; title: string; sources: Provenance[]; note?: string; className?: string;
}) {
  const set = useSim((s) => s.set);
  const s = band && value != null ? bandSig(value, band.p05, band.p95) : 3;
  return (
    <button type="button" data-receipt={title} className={`num text-left underline decoration-dotted decoration-faint underline-offset-4 hover:decoration-ink ${className}`}
      onClick={() => set({ receipt: { title, value: value ?? null, units, band, sources, note } })}
      aria-label={`${title}: ${value == null ? "no data" : sig(value, s)} ${units}. Open receipt`}>
      {value == null ? "∅" : sig(value, s)}{units && <span className="ml-1 text-[12px] text-mute">{units}</span>}
      {band && value != null && <span className="ml-1 text-[12px] text-mute">{fmtBand(band.p05, band.p95, s)}</span>}
    </button>
  );
}

export function Section({ title, children, open: initial = true, right, testid, id }: { title: string; children: React.ReactNode; open?: boolean; right?: React.ReactNode; testid?: string; id?: string }) {
  const [open, setOpen] = useState(initial);
  return (
    <section className="scroll-mt-2 border-b border-line py-2" data-testid={testid} id={id}>
      <div className="flex items-center justify-between gap-2">
        <button type="button" className="label flex items-center gap-1 py-1 hover:text-ink" aria-expanded={open} onClick={() => setOpen(!open)}>
          <span aria-hidden className="inline-block w-3">{open ? "▾" : "▸"}</span>{title}
        </button>
        {right}
      </div>
      {open && <div className="space-y-2 pb-1 pt-1">{children}</div>}
    </section>
  );
}

/** Labelled numeric field with units; `source` shows on hover. Values are converted at I/O by `toSI`/`fromSI`. */
export function NumField({ label, value, units, onChange, source, step = "any", min, max, required, testid }: {
  label: string; value: number | null; units: string; onChange: (v: number | null) => void; source?: string;
  step?: number | "any"; min?: number; max?: number; required?: boolean; testid?: string;
}) {
  const missing = required && (value == null || !Number.isFinite(value));
  return (
    <label className="grid grid-cols-[1fr_auto] items-center gap-2 text-[13px]" title={source ?? "User input"}>
      <span className={missing ? "text-warn" : "text-mute"}>{label}{missing && " (required: no sourced value)"}</span>
      <span className="flex items-center gap-1">
        <input type="number" className="num w-24 text-right" value={value == null || !Number.isFinite(value) ? "" : value} step={step} min={min} max={max}
          data-testid={testid} aria-invalid={missing || undefined}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))} />
        <span className="w-12 text-[12px] text-faint">{units}</span>
      </span>
    </label>
  );
}

export function TheoryBadge({ what }: { what: string }) {
  // Links straight to the model's section in Methods (what it is, why it is uncalibrated, which data would calibrate it).
  return <a href={methodsHref(what)} className="chip border border-dashed border-theory/60 text-theory hover:border-theory" title={`${what}: not calibrated against PSI data; theory only. Open its Methods section`}>◌ Theory-only · {what} <span aria-hidden>→</span></a>;
}
export function BoundedBadge() {
  return <span className="chip border border-warn/50 text-warn" title="PSI has microgravity and 1 g data only">Partial gravity: bounded estimate (µg ↔ 1 g)</span>;
}

/** Methods anchor for a sub-model key (spread, habitat, smoke, suppression); unknown keys go to the model overview. */
export const methodsHref = (what: string) => ["spread", "habitat", "smoke", "suppression"].includes(what) ? `/methods#model-${what}` : "/methods#overview";
