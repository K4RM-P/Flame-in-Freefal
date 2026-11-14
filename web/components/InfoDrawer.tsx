"use client";
import { useState } from "react";
import summary from "@/data/validation/summary.json";
import { EQUATIONS } from "@/lib/equations";
import type { ModelResult } from "@/lib/physics/models";
import { Tex } from "./Tex";
import { SourcePill, StatusChip, ValidityBadges, fmt } from "./bits";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TARGETS = (summary as any).targets as { id: string; model: string; quantity: string; status: string; predicted: unknown; published: unknown }[];

export function InfoButton({ r }: { r: ModelResult }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button aria-label="model details" className="grid h-6 w-6 place-items-center rounded-full border border-line text-xs text-mute hover:border-accent hover:text-accent" onClick={() => setOpen(true)}>ⓘ</button>
      {open && <InfoDrawer r={r} onClose={() => setOpen(false)} />}
    </>
  );
}

export function InfoDrawer({ r, onClose }: { r: ModelResult; onClose: () => void }) {
  const vals = TARGETS.filter((t) => t.model === r.model_id);
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={onClose}>
      <aside className="h-full w-full max-w-xl overflow-y-auto border-l border-line bg-panel p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Model: {r.model_id}</h3>
          <button className="btn" onClick={onClose}>Close</button>
        </div>
        <ValidityBadges r={r} />
        {r.validity.note && <p className="mt-2 text-sm text-warn">{r.validity.note}</p>}
        <h4 className="label mt-4">Equations</h4>
        {r.equation_ids.map((id) => EQUATIONS[id] && (
          <div key={id} className="mt-2 rounded border border-line p-2">
            <div className="text-xs text-mute">{id} · {EQUATIONS[id].text} <SourcePill id={EQUATIONS[id].ref} /></div>
            <Tex tex={EQUATIONS[id].tex} block />
          </div>
        ))}
        <h4 className="label mt-4">Inputs</h4>
        <table className="data"><tbody>{Object.entries(r.inputs).map(([k, val]) => (
          <tr key={k}><td className="text-mute">{k}</td><td className="num">{typeof val === "number" ? fmt(val, 4) : String(val)}</td></tr>
        ))}</tbody></table>
        <h4 className="label mt-4">Assumptions</h4>
        <ul className="ml-4 list-disc text-sm text-mute">{r.assumptions.map((a) => <li key={a}>{a}</li>)}</ul>
        <h4 className="label mt-4">Validation</h4>
        {vals.length ? (
          <table className="data"><tbody>{vals.map((t) => (
            <tr key={t.id}><td>{t.id}</td><td className="text-mute">{t.quantity}</td><td className="num">{String(t.predicted ?? "—")}</td><td><StatusChip status={t.status} /></td></tr>
          ))}</tbody></table>
        ) : <p className="text-sm text-mute">No validation target yet.</p>}
        <h4 className="label mt-4">Sources</h4>
        <div>{r.sources.map((s) => <SourcePill key={s} id={s} />)}</div>
      </aside>
    </div>
  );
}
