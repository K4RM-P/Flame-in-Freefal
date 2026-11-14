"use client";
// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
import { useEffect, useRef } from "react";
import type { Receipt } from "@/lib/review";
import { sig } from "@/lib/ui/format";

export function ReceiptDrawer({ receipt, onClose }: { receipt: Receipt | null; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!receipt) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    ref.current?.focus();
    return () => window.removeEventListener("keydown", k);
  }, [receipt, onClose]);
  if (!receipt) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose} data-noprint>
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={`Receipt: ${receipt.title}`} data-testid="receipt-drawer"
        onClick={(e) => e.stopPropagation()}
        className="h-full w-full max-w-[720px] overflow-y-auto border-l border-line bg-panel p-5 shadow-2xl outline-none">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="label">Receipt</p>
            <h2 className="text-[20px] font-semibold">{receipt.title}</h2>
            <p className="num mt-1 text-[24px]">{receipt.value}</p>
          </div>
          <button className="btn" onClick={onClose} aria-label="Close receipt">Close</button>
        </div>
        <p className="mt-4 text-[13px]"><span className="label mr-2">Rule</span>{receipt.rule}</p>
        {receipt.note && <p className="mt-2 text-[13px] text-warn">{receipt.note}</p>}
        <div className="mt-4 overflow-x-auto border border-line">
          <table className="w-full text-[12px]">
            <thead className="text-mute"><tr className="text-left">
              {["id", "investigation", "x_o2", "p kPa", "flow cm/s", "outcome", "spread mm/s", "locator"].map((h) => <th key={h} className="px-2 py-1.5 font-medium">{h}</th>)}
            </tr></thead>
            <tbody>
              {receipt.rows.length === 0 && <tr><td colSpan={8} className="px-2 py-2 text-mute">∅ No rows.</td></tr>}
              {receipt.rows.map((t) => (
                <tr key={t.id} className="border-t border-line">
                  <td className="num px-2 py-1">{t.id}</td>
                  <td className="px-2 py-1">{t.investigation_id}</td>
                  <td className="num px-2 py-1">{sig(t.x_o2, 3)}</td>
                  <td className="num px-2 py-1">{sig(t.pressure_kpa, 3)}</td>
                  <td className="num px-2 py-1">{sig(t.flow_cm_s, 3)}</td>
                  <td className="px-2 py-1">{t.outcome === "burn" ? "● burn" : t.outcome === "extinct" ? "✕ extinct" : t.outcome}</td>
                  <td className="num px-2 py-1">{sig(t.spread_rate_mm_s ?? null, 3)}</td>
                  <td className="px-2 py-1 text-mute">{t.locator}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="label mt-4">Sources</p>
        <ul className="mt-1 flex flex-wrap gap-2">{receipt.sources.map((s) => <li key={s} className="chip border border-line">{s}</li>)}</ul>
      </div>
    </div>
  );
}
