"use client";
import type { ModelResult } from "@/lib/physics/models";
import { useMission } from "@/lib/store";
import { statusOf } from "@/lib/ui/status";
import { bandSig, sig } from "@/lib/ui/format";
import { NumberTween, StatusChip } from "@/components/ui-kit";

export function Delta({ a, b }: { a: number | null | undefined; b: number }) {
  if (a == null || !Number.isFinite(a) || a === 0) return null;
  const d = (b - a) / Math.abs(a);
  return <span className="num text-[12px] text-mute">A {sig(a)} → {d >= 0 ? "▲" : "▼"} {sig(Math.abs(d) * 100, 2)}%</span>;
}

export function ResultCard({ title, r, value, unit, scale = 1, meaning, children, testid, aValue }: {
  title: string; r: ModelResult | null; value?: number | null; unit?: string; scale?: number; meaning: React.ReactNode; children?: React.ReactNode; testid?: string; aValue?: number | null;
}) {
  const open = () => r && useMission.setState({ drawer: { kind: "receipt", result: r, title } });
  const st = statusOf(r);
  const v = value ?? (r ? r.value * scale : null);
  const s = r ? bandSig(r.uncertainty.p50, r.uncertainty.p05, r.uncertainty.p95) : 3;
  return (
    <section className={`border bg-panel p-4 ${st.status === "theory" ? "border-dashed border-theory/60" : st.status === "extrapolation" ? "border-warn/60" : "border-line"}`} data-testid={testid}>
      <div className="flex items-start justify-between gap-2"><h3 className="text-[13px] font-medium text-mute">{title}</h3><StatusChip {...st} /></div>
      {r ? (
        <button onClick={open} className="mt-1 block text-left" aria-label={`${title}: open receipt`} data-receipt>
          <NumberTween value={v} s={s} className="text-[32px] leading-tight" /> <span className="text-[14px] text-mute">{unit ?? r.units}</span>
          {r.uncertainty && !(value != null) && <span className="num ml-1 text-[13px] text-mute">({sig(r.uncertainty.p05 * scale, 2)}–{sig(r.uncertainty.p95 * scale, 2)})</span>}
        </button>
      ) : <p className="mt-1 text-[32px] leading-tight text-faint">∅</p>}
      {aValue !== undefined && v != null && <div><Delta a={aValue} b={v} /></div>}
      <p className="mt-1 text-[13px] text-mute">{meaning}</p>
      {children}
      {r && <button onClick={open} className="mt-2 text-[12px] text-mute underline underline-offset-2 hover:text-ink">Receipt →</button>}
    </section>
  );
}
