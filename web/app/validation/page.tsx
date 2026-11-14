"use client";
import { useState } from "react";
import summary from "@/data/validation/summary.json";
import kJson from "@/data/validation/droplet_K.json";
import dJson from "@/data/validation/droplet_dext.json";
import loiJson from "@/data/validation/loi_curves.json";
import { Plot } from "@/components/Plot";
import { SourcePill, StatusChip, fmt } from "@/components/bits";
import { TEST_POINTS } from "@/lib/testPoints";

/* eslint-disable @typescript-eslint/no-explicit-any */
const T = (summary as any).targets as any[];
const K = kJson as any, DX = dJson as any, LOI = loiJson as any;

export default function Validation() {
  const [rows, setRows] = useState<"K" | "dext">("K");
  const parity = (pts: any[], unit: string, title: string) => {
    const mx = Math.max(...pts.map((p) => Math.max(p.obs, p.pred ?? 0))) * 1.1;
    return (
      <Plot height={330} data={[
        { x: [0, mx], y: [0, mx], mode: "lines", line: { color: "#8b95a7", dash: "dash" }, name: "1:1", hoverinfo: "skip" },
        ...["n-heptane", "methanol"].map((f, i) => {
          const q = pts.filter((p) => p.fuel === f && p.pred != null);
          return { x: q.map((p) => p.obs), y: q.map((p) => p.pred), mode: "markers", name: f,
            marker: { symbol: i ? "diamond" : "circle", size: 8, color: i ? "#4ea1ff" : "#ff6b35", line: { color: "#0b0e14", width: 1 } },
            text: q.map((p) => `${p.id} · ${p.diluent} · O₂ ${p.x_o2} · ${fmt(p.P_kPa, 4)} kPa${p.mode ? ` · ${p.mode}` : ""}<br>${p.locator ?? ""}`), hoverinfo: "text+x+y" };
        }),
      ]} layout={{ title: { text: title, font: { size: 13 } }, xaxis: { title: { text: `observed ${unit}` }, range: [0, mx] }, yaxis: { title: { text: `predicted ${unit}` }, range: [0, mx] } }} />
    );
  };
  const lab = TEST_POINTS.filter((t) => t.diluent === "N2" && Math.abs(t.pressure_kpa - 101.3) < 8 && t.d_ext_mm && t.outcome.includes("_ext"));
  return (
    <div className="space-y-6" data-testid="validation">
      <div>
        <h1 className="text-2xl font-semibold">Validation Lab</h1>
        <p className="text-sm text-mute">Every model against published values and held-out FLEX campaigns (grouped split by test series; nothing here was used to fit). Failures are shown, with reasons.</p>
      </div>
      <section className="card overflow-x-auto">
        <table className="data" data-testid="validation-table">
          <thead><tr><th>ID</th><th>Model</th><th>Quantity</th><th>Published</th><th>Predicted</th><th>Criterion</th><th>Status</th><th>Source</th></tr></thead>
          <tbody>{T.map((t) => (
            <tr key={t.id}>
              <td className="num">{t.id}</td><td>{t.model}</td><td>{t.quantity}{t.note && <div className="text-xs text-mute">{t.note}</div>}</td>
              <td className="num">{typeof t.published === "object" ? JSON.stringify(t.published) : String(t.published)}</td>
              <td className="num">{t.predicted ?? "—"}</td><td className="num">{t.criterion}</td><td><StatusChip status={t.status} /></td><td><SourcePill id={t.source} /></td>
            </tr>))}</tbody>
        </table>
      </section>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card">
          {parity(K.parity, "K mm²/s", "V5 · burning-rate constant K, held-out FLEX campaigns")}
          <p className="num text-xs text-mute">n={K.metrics.n} · RMSE {fmt(K.metrics.rmse)} mm²/s · MAPE {fmt(K.metrics.mape)}% · bias {fmt(K.metrics.bias)} ·
            {" "}heptane MAPE {fmt(K.by_fuel["n-heptane"].mape)}% · methanol MAPE {fmt(K.by_fuel.methanol.mape)}%</p>
        </section>
        <section className="card">
          {parity(DX.parity, "d_ext mm", "Extinction diameter (author-labelled mode), held-out")}
          <p className="num text-xs text-mute">n={DX.metrics.n} · RMSE {fmt(DX.metrics.rmse)} mm · MAPE {fmt(DX.metrics.mape)}% · bias {fmt(DX.metrics.bias)} mm · {DX.metrics.n_no_burning_predicted} tests where the model predicts no quasi-steady burning</p>
        </section>
      </div>
      <section className="card">
        <Plot height={380} data={[
          ...["n-heptane", "methanol"].flatMap((f, i) => [
            { x: LOI[f].x_o2.map((x: number) => x * 100), y: LOI[f].d_diff_mm, name: `${f} diffusive ext. (model)`, line: { color: i ? "#4ea1ff" : "#ff6b35" } },
            { x: LOI[f].x_o2.map((x: number) => x * 100), y: LOI[f].d_rad_mm, name: `${f} radiative ext. (model)`, line: { color: i ? "#4ea1ff" : "#ff6b35", dash: "dash" } },
          ]),
          ...["diffusive_ext", "radiative_ext"].map((mode) => {
            const q = lab.filter((t) => t.outcome === mode);
            return { x: q.map((t) => t.x_o2 * 100), y: q.map((t) => t.d_ext_mm), mode: "markers", name: `FLEX ${mode.replace("_ext", "")} (1 atm, O₂/N₂)`,
              marker: { symbol: mode === "diffusive_ext" ? "circle" : "x-thin", size: 9, color: q.map((t) => (t.fuel === "methanol" ? "#4ea1ff" : "#ff6b35")), line: { width: 2, color: q.map((t) => (t.fuel === "methanol" ? "#4ea1ff" : "#ff6b35")) } },
              text: q.map((t) => `${t.test_label} ${t.fuel} (${t.split})<br>${t.caption_snippet ?? ""}`), hoverinfo: "text" };
          }),
        ]} layout={{ title: { text: "Dual extinction: LOI is where the curves meet (V1/V2)", font: { size: 13 } }, xaxis: { title: { text: "O₂ mole %" } }, yaxis: { title: { text: "extinction diameter mm" }, type: "log" } }} />
        <p className="text-xs text-mute">Model LOI: heptane {fmt(LOI["n-heptane"].loi * 100)}% (published ≈15%), methanol {fmt(LOI.methanol.loi * 100)}% (≈12%) <SourcePill id="dietrich-2014" /></p>
      </section>
      <section className="card">
        <div className="mb-2 flex items-center gap-2"><span className="label">Data rows used</span>
          <button className={`btn ${rows === "K" ? "border-accent" : ""}`} onClick={() => setRows("K")}>K (V5)</button>
          <button className={`btn ${rows === "dext" ? "border-accent" : ""}`} onClick={() => setRows("dext")}>extinction diameter</button></div>
        <div className="max-h-96 overflow-y-auto">
          <table className="data"><thead><tr><th>test</th><th>fuel</th><th>diluent</th><th>O₂</th><th>kPa</th><th>observed</th><th>predicted</th><th>locator</th></tr></thead>
            <tbody>{(rows === "K" ? K.parity : DX.parity).map((p: any) => (
              <tr key={p.id}><td className="num">{p.id}</td><td>{p.fuel}</td><td>{p.diluent}</td><td className="num">{p.x_o2}</td><td className="num">{fmt(p.P_kPa, 4)}</td>
                <td className="num">{fmt(p.obs)}</td><td className="num">{fmt(p.pred)}</td><td className="text-xs text-mute">{p.locator}<SourcePill id={p.source_id} /></td></tr>))}</tbody></table>
        </div>
      </section>
    </div>
  );
}
