"use client";
// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
import { AnimatePresence, animate, motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import { GLOSSARY } from "@/lib/ui/glossary";
import { spring, press } from "@/lib/ui/motion";
import { sig } from "@/lib/ui/format";
import type { Status } from "@/lib/ui/status";

/** Number that springs between values (numeric transition). */
export function NumberTween({ value, s = 3, className = "" }: { value: number | null; s?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef<number | null>(value);
  const reduce = useReducedMotion();
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (value == null || !Number.isFinite(value) || prev.current == null || reduce) { el.textContent = sig(value, s); prev.current = value; return; }
    const c = animate(prev.current, value, { ...spring.default, onUpdate: (v) => { el.textContent = sig(v, s); } });
    prev.current = value;
    return () => c.stop();
  }, [value, s, reduce]);
  return <span ref={ref} className={`num ${className}`}>{sig(value, s)}</span>;
}

const STATUS: Record<Status, { label: string; cls: string; icon: string }> = {
  validated: { label: "Validated", cls: "text-ok border-ok/40", icon: "✓" },
  extrapolation: { label: "Extrapolation", cls: "text-warn border-warn/50", icon: "⚠" },
  theory: { label: "Theory-only", cls: "text-theory border-theory/60 border-dashed", icon: "◌" },
  nodata: { label: "No data", cls: "text-mute border-line", icon: "∅" },
};
export function StatusChip({ status, reason }: { status: Status; reason?: string }) {
  const s = STATUS[status];
  return <span className={`chip border ${s.cls}`} title={reason} aria-label={`${s.label}${reason ? `: ${reason}` : ""}`}>{s.icon} {s.label}</span>;
}

export function Term({ k, children }: { k: string; children?: React.ReactNode }) {
  return <span className="term" title={GLOSSARY[k] ?? k} tabIndex={0}>{children ?? k}</span>;
}

export function Callout({ children }: { children: React.ReactNode }) {
  return <div className="border-l-2 border-line pl-3 text-[13px] text-mute measure">{children}</div>;
}

/** Segmented control with a sliding indicator (shared layout animation). */
export function Segmented<T extends string | number>({ options, value, onChange, testid, size = "sm" }: { options: { v: T; label: string; testid?: string }[]; value: T; onChange: (v: T) => void; testid?: string; size?: "sm" | "md" }) {
  const id = useId();
  return (
    <div role="radiogroup" data-testid={testid} className="relative inline-flex border border-line bg-bg p-0.5" style={{ borderRadius: 6 }}>
      {options.map((o) => (
        <button key={String(o.v)} role="radio" aria-checked={o.v === value} data-testid={o.testid} onPointerDown={() => onChange(o.v)} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onChange(o.v)}
          className={`relative z-10 ${size === "md" ? "px-3 py-1.5 text-[14px]" : "px-2.5 py-1 text-[13px]"} ${o.v === value ? "text-bg" : "text-mute hover:text-ink"}`}>
          {o.v === value && <motion.span layoutId={`seg-${id}`} transition={spring.snappy} className="absolute inset-0 -z-10 bg-ink" style={{ borderRadius: 4 }} />}
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function PressButton({ children, className = "btn", ...rest }: React.ComponentProps<typeof motion.button>) {
  return <motion.button {...press} className={className} {...rest}>{children}</motion.button>;
}

/** Slider with value bubble while dragging, optional data-density histogram behind it. */
export function ParamSlider({ label, value, min, max, step, onChange, unit, hist, warn }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; unit?: string; hist?: number[]; warn?: string }) {
  const [drag, setDrag] = useState(false);
  const pct = ((value - min) / (max - min)) * 100;
  const hmax = hist ? Math.max(1, ...hist) : 1;
  return (
    <label className="block">
      <span className="flex justify-between text-[13px]"><span className="text-mute">{label}</span><span className="num">{value}{unit ? ` ${unit}` : ""}</span></span>
      <span className="relative block h-8">
        {hist && <span className="absolute inset-x-0 bottom-3 flex h-5 items-end gap-px" aria-hidden>{hist.map((h, i) => <span key={i} className="flex-1 bg-mute/30" style={{ height: `${(h / hmax) * 100}%` }} />)}</span>}
        <input type="range" min={min} max={max} step={step} value={value} aria-label={label} className="absolute inset-x-0 bottom-0 w-full"
          onChange={(e) => onChange(Number(e.target.value))} onPointerDown={() => setDrag(true)} onPointerUp={() => setDrag(false)} onBlur={() => setDrag(false)} />
        <AnimatePresence>{drag && (
          <motion.span initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={spring.snappy}
            className="num pointer-events-none absolute -top-5 -translate-x-1/2 border border-line bg-surface2 px-1 text-[12px]" style={{ left: `${pct}%`, borderRadius: 4 }}>{value}</motion.span>
        )}</AnimatePresence>
      </span>
      {hist && <span className="text-[12px] text-faint">bars: PSI test density</span>}
      {warn && <span className="block text-[12px] text-warn">⚠ {warn}</span>}
    </label>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: React.ReactNode; action?: React.ReactNode }) {
  return <div className="border border-dashed border-line p-6 text-center"><p className="font-medium">∅ {title}</p><div className="mt-1 text-[13px] text-mute">{children}</div>{action && <div className="mt-3">{action}</div>}</div>;
}
export function Skeleton({ h = 200 }: { h?: number }) {
  return <div className="animate-pulse bg-surface2" style={{ height: h }} aria-busy="true" aria-label="loading" />;
}

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button className="btn" onClick={async () => { try { await navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 1400); } catch { /* clipboard blocked */ } }}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span key={String(ok)} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={spring.snappy}>{ok ? "✓ Copied" : label}</motion.span>
      </AnimatePresence>
    </button>
  );
}
