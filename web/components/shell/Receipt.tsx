"use client";
// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
import Link from "next/link";
import { useState } from "react";
import kJson from "@/data/validation/droplet_K.json";
import { EQUATIONS } from "@/lib/equations";
import { source } from "@/lib/sources";
import type { ModelResult } from "@/lib/physics/models";
import { download, reportMarkdown } from "@/lib/report";
import { statusOf, targetsFor } from "@/lib/ui/status";
import { sig } from "@/lib/ui/format";
import { TEST_POINTS } from "@/lib/testPoints";
import { Plot } from "@/components/Plot";
import { Tex } from "@/components/Tex";
import { CopyButton, Segmented, StatusChip } from "@/components/ui-kit";
import { SourcePill } from "@/components/bits";

/* eslint-disable @typescript-eslint/no-explicit-any */
const K = kJson as any;
const TABS = ["Equation", "Inputs", "Assumptions", "Validation", "Data", "Sources"] as const;
const EQ_IDS = Object.keys(EQUATIONS);

export function Receipt({ r, title }: { r: ModelResult; title: string }) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Equation");
  const st = statusOf(r);
  const rows = r.model_id === "droplet"
    ? TEST_POINTS.filter((t) => t.fuel === r.inputs.fuel && Math.abs(t.x_o2 - (r.inputs.x_o2 as number)) <= 0.03 && t.diluent === r.inputs.diluent).slice(0, 25) : [];
  const cite = `${title}: ${sig(r.value)} ${r.units} (p05–p95 ${sig(r.uncertainty.p05)}–${sig(r.uncertainty.p95)}); EmberAtlas model "${r.model_id}", eqs ${r.equation_ids.join(", ")}; sources: ${r.sources.map((s) => source(s).title).join("; ")}.`;
  const width = r.uncertainty.p50 ? (r.uncertainty.p95 - r.uncertainty.p05) / Math.abs(r.uncertainty.p50) : NaN;
  return (
    <div className="flex h-full flex-col">
      <div className="space-y-1 border-b border-line pb-3">
        <p className="label">Receipt</p>
        <h3 className="text-[20px] font-semibold">{title}</h3>
        <p className="num text-[24px]">{sig(r.value)} <span className="text-[14px] text-mute">{r.units}</span> <span className="text-[13px] text-mute">({sig(r.uncertainty.p05, 2)}–{sig(r.uncertainty.p95, 2)})</span></p>
        <StatusChip {...st} /> <span className="text-[12px] text-mute">{st.reason}</span>
      </div>
      <div className="my-3 overflow-x-auto"><Segmented options={TABS.map((t) => ({ v: t, label: t }))} value={tab} onChange={setTab} /></div>
      <div className="flex-1 overflow-y-auto pr-1 text-[13px]">
        {tab === "Equation" && r.equation_ids.filter((e) => EQUATIONS[e]).map((e) => (
          <div key={e} className="mb-2 border-b border-line pb-2">
            <Link href={`/methods#eq-${e}`} className="text-[12px] text-mute underline">Eq. {EQ_IDS.indexOf(e) + 1} ({e}) · {EQUATIONS[e].text}</Link>
            <Tex tex={EQUATIONS[e].tex} block />
          </div>))}
        {tab === "Inputs" && (
          <table className="data"><tbody>{Object.entries(r.inputs).map(([k, v]) => (
            <tr key={k} className={!r.validity.in_envelope && r.validity.calibrated && ["x_o2", "P_kPa", "d0_mm"].includes(k) ? "text-warn" : ""}>
              <td className="text-mute">{k}</td><td className="num">{typeof v === "number" ? String(v) : String(v)}</td></tr>))}</tbody></table>)}
        {tab === "Assumptions" && <ul className="ml-4 list-disc space-y-1 text-mute">{r.assumptions.map((a) => <li key={a}>{a}</li>)}</ul>}
        {tab === "Validation" && (
          <div className="space-y-2">
            <table className="data"><tbody>
              <tr><td className="text-mute">Precision (p05–p95 width / p50)</td><td className="num">{Number.isFinite(width) ? `${sig(width * 100, 2)}%` : "—"}</td></tr>
              {r.model_id === "droplet" && <><tr><td className="text-mute">Accuracy (MAPE, held-out K)</td><td className="num">{sig(K.metrics.mape, 3)}% (n={K.metrics.n})</td></tr>
                <tr><td className="text-mute">Bias (held-out K)</td><td className="num">{sig(K.metrics.bias, 2)} mm²/s</td></tr></>}
            </tbody></table>
            {r.model_id === "droplet" && <Plot height={220} label="parity plot of burning-rate constant" data={[
              { x: [0, 1.1], y: [0, 1.1], mode: "lines", line: { dash: "dash", color: "#9AA1B2" }, hoverinfo: "skip", showlegend: false },
              { x: K.parity.map((p: any) => p.obs), y: K.parity.map((p: any) => p.pred), mode: "markers", marker: { color: "#E69F00", size: 6 }, showlegend: false, text: K.parity.map((p: any) => p.id) }]}
              layout={{ margin: { l: 40, r: 8, t: 8, b: 36 }, xaxis: { title: { text: "observed K (mm²/s)" } }, yaxis: { title: { text: "predicted" } } }} />}
            {targetsFor(r.model_id).length ? (
              <table className="data"><tbody>{targetsFor(r.model_id).map((t) => <tr key={t.id}><td className="num">{t.id}</td><td>{t.quantity}</td><td>{t.status}</td></tr>)}</tbody></table>
            ) : <p className="text-mute">No validation target for this model yet.</p>}
          </div>)}
        {tab === "Data" && (rows.length ? (
          <table className="data"><thead><tr><th>test</th><th>O₂</th><th>kPa</th><th>K</th><th>d_ext</th><th>source</th></tr></thead>
            <tbody>{rows.map((t) => <tr key={t.id}><td className="num">{t.test_label}</td><td className="num">{t.x_o2}</td><td className="num">{sig(t.pressure_kpa)}</td><td className="num">{sig(t.K_mm2_s)}</td><td className="num">{sig(t.d_ext_mm)}</td><td className="text-[12px] text-mute">{t.locator}</td></tr>)}</tbody></table>
        ) : <p className="text-mute">∅ No verified PSI rows calibrate this model yet. <Link href="/gaps" className="underline">See Gaps →</Link></p>)}
        {tab === "Sources" && <ul className="space-y-1">{r.sources.map((s) => <li key={s}><SourcePill id={s} /> {source(s).title}</li>)}</ul>}
      </div>
      <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
        <Link href={`/models/${r.model_id}`} className="btn">Open full model</Link>
        <CopyButton text={cite} label="Copy as citation" />
        <button className="btn" onClick={() => download(`emberatlas-${r.model_id}-receipt.md`, reportMarkdown(r, title))}>Export receipt (Markdown)</button>
      </div>
    </div>
  );
}
