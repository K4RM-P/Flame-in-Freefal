"use client";
// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
import { useMemo, useState } from "react";
import summary from "@/data/validation/summary.json";
import kJson from "@/data/validation/droplet_K.json";
import dJson from "@/data/validation/droplet_dext.json";
import loiJson from "@/data/validation/loi_curves.json";
import { Plot } from "@/components/Plot";
import { SourcePill } from "@/components/bits";
import { Callout, Segmented, Term } from "@/components/ui-kit";
import { TEST_POINTS } from "@/lib/testPoints";
import { trust } from "@/lib/ui/trust";
import { sig } from "@/lib/ui/format";
import { FUEL_COLOR } from "@/lib/ui/palette";

/* eslint-disable @typescript-eslint/no-explicit-any */
const T = (summary as any).targets as any[];
const K = kJson as any, DX = dJson as any, LOI = loiJson as any;
const ICON: Record<string, [string, string]> = { pass: ["✓ pass", "text-ok"], fail: ["✗ fail", "text-bad"], partial: ["◐ partial", "text-warn"], "pending data": ["— not run", "text-mute"] };
const SPLIT = Object.fromEntries(TEST_POINTS.map((t) => [t.id, t.split]));

function Dial({ name, value, unit, def, note }: { name: string; value: string; unit: string; def: string; note: string }) {
  return (
    <div className="border-t border-line pt-3" title={def}>
      <p className="label">{name}</p>
      <p className="num text-[32px]">{value}<span className="text-[16px] text-mute">{unit}</span></p>
      <p className="text-[13px] text-mute">{note}</p>
      <p className="text-[12px] text-faint">{def}</p>
    </div>
  );
}

export function ValidationLab() {
  const [tab, setTab] = useState<"K" | "dext" | "loi">("K");
  const tr = useMemo(() => trust(), []);
  const parity = (pts: any[], unit: string) => {
    const mx = Math.max(...pts.map((p) => Math.max(p.obs, p.pred ?? 0))) * 1.1;
    return (
      <Plot height={360} label={`parity plot ${unit}`} data={[
        { x: [0, mx], y: [0, mx], mode: "lines", line: { color: "#9AA1B2", dash: "dash", width: 1 }, name: "y = x", hoverinfo: "skip" },
        { x: [0, mx, mx, 0], y: [0, mx * 1.2, mx * 0.8, 0], fill: "toself", fillcolor: "rgba(154,161,178,0.10)", line: { width: 0 }, name: "±20%", hoverinfo: "skip" },
        ...["n-heptane", "methanol"].map((f) => {
          const q = pts.filter((p) => p.fuel === f && p.pred != null);
          return { x: q.map((p) => p.obs), y: q.map((p) => p.pred), mode: "markers", name: `${f} (held-out)`,
            marker: { symbol: f === "methanol" ? "diamond" : "circle", size: 8, color: FUEL_COLOR[f] },
            text: q.map((p) => `${p.id} · ${SPLIT[p.id]} · ${p.diluent} · O₂ ${p.x_o2} · ${sig(p.P_kPa)} kPa<br>${p.locator ?? ""}`), hoverinfo: "text+x+y" };
        }),
      ]} layout={{ xaxis: { title: { text: `measured ${unit}` }, range: [0, mx] }, yaxis: { title: { text: `predicted ${unit}` }, range: [0, mx] } }} />
    );
  };
  const resid = (pts: any[], unit: string) => (
    <Plot height={240} label="residuals versus oxygen" data={["n-heptane", "methanol"].map((f) => {
      const q = pts.filter((p) => p.fuel === f && p.pred != null);
      return { x: q.map((p) => p.x_o2 * 100), y: q.map((p) => p.pred - p.obs), mode: "markers", name: f, marker: { color: FUEL_COLOR[f], size: 7, symbol: f === "methanol" ? "diamond" : "circle" } };
    })} layout={{ xaxis: { title: { text: "O₂ (mole %)" } }, yaxis: { title: { text: `residual (${unit})` }, zeroline: true } }} />
  );
  const lab = TEST_POINTS.filter((t) => t.diluent === "N2" && Math.abs(t.pressure_kpa - 101.3) < 8 && t.d_ext_mm && t.outcome.includes("_ext"));
  const cur = tab === "K" ? K : DX;
  return (
    <div className="space-y-8" data-testid="validation">
      <header className="space-y-2">
        <h2 className="display text-[24px]">How much should you trust these models?</h2>
        <Callout>Held-out ISS data only: FLEX campaigns were split by test series before fitting, and published LOIs were never used by the droplet fit. Failures stay on this page with the reason.</Callout>
      </header>
      <section className="grid gap-6 md:grid-cols-3" data-testid="trust-dials">
        <Dial name="Accuracy" value={sig(tr.accuracy.value, 2)} unit="%" note={`median abs. error, K (n=${tr.accuracy.n}); extinction diameter ${sig(tr.accuracy.dext, 2)}% (n=${tr.accuracy.nd})`}
          def="Median absolute % error of predictions against held-out ISS measurements." />
        <Dial name="Precision" value={sig(tr.precision.value, 2)} unit="%" note="median p05–p95 band width relative to p50, K"
          def="How wide the model's own uncertainty band is: narrower is more precise." />
        <Dial name="Reliability" value={sig(tr.reliability.value, 2)} unit="%" note={`held-out K inside the predicted p05–p95 band (n=${tr.reliability.n}); 90% would be ideal`}
          def="Share of held-out measurements that fall inside the predicted band. Low means the band is overconfident." />
      </section>
      {tr.reliability.value < 70 && <Callout>Reliability is low: the K band only carries property and conductivity-factor uncertainty, while test-to-test scatter (droplet drift, disruption) is larger. Bands are overconfident for single tests.</Callout>}

      <section>
        <p className="label mb-2">Scoreboard</p>
        <div className="overflow-x-auto border border-line">
          <table className="data" data-testid="validation-table">
            <thead><tr><th>ID</th><th>Target</th><th>Published</th><th>Ours</th><th>Tolerance</th><th>Source</th><th>Status</th></tr></thead>
            <tbody>{T.map((t) => (
              <tr key={t.id}>
                <td className="num">{t.id}</td>
                <td>{t.quantity} <span className="text-[12px] text-faint">· {t.model}</span>
                  {t.note && <details className="text-[12px] text-mute"><summary className="cursor-pointer">{t.status === "fail" ? "Why it fails" : "Note"}</summary>{t.note}</details>}</td>
                <td className="num">{typeof t.published === "object" ? JSON.stringify(t.published) : String(t.published)}</td>
                <td className="num">{t.predicted ?? "—"}</td><td className="num">{t.criterion}</td><td><SourcePill id={t.source} /></td>
                <td className={`whitespace-nowrap ${ICON[t.status]?.[1]}`}>{ICON[t.status]?.[0] ?? t.status}</td>
              </tr>))}</tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <Segmented options={[{ v: "K", label: "Burning rate K" }, { v: "dext", label: "Extinction diameter" }, { v: "loi", label: "LOI curves" }]} value={tab} onChange={(v) => setTab(v as never)} />
        {tab !== "loi" ? (
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-7 border border-line p-2">{parity(cur.parity, tab === "K" ? "K (mm²/s)" : "d_ext (mm)")}
              <p className="px-2 text-[12px] text-faint">How to read: points on the dashed line are perfect predictions; the shaded wedge is ±20%. Colour = fuel; all points are FLEX held-out tests.</p></div>
            <div className="lg:col-span-5 space-y-3">
              <table className="data"><tbody>
                <tr><td className="text-mute">n</td><td className="num">{cur.metrics.n}</td></tr>
                <tr><td className="text-mute">RMSE</td><td className="num">{sig(cur.metrics.rmse)} {tab === "K" ? "mm²/s" : "mm"}</td></tr>
                <tr><td className="text-mute">MAPE</td><td className="num">{sig(cur.metrics.mape)}%</td></tr>
                <tr><td className="text-mute">bias</td><td className="num">{sig(cur.metrics.bias, 2)}</td></tr>
              </tbody></table>
              <div className="border border-line p-2">{resid(cur.parity, tab === "K" ? "mm²/s" : "mm")}</div>
            </div>
          </div>
        ) : (
          <div className="border border-line p-2">
            <Plot height={380} label="dual extinction curves versus oxygen" data={[
              ...["n-heptane", "methanol"].flatMap((f) => [
                { x: LOI[f].x_o2.map((x: number) => x * 100), y: LOI[f].d_diff_mm, name: `${f} diffusive (model)`, line: { color: FUEL_COLOR[f] } },
                { x: LOI[f].x_o2.map((x: number) => x * 100), y: LOI[f].d_rad_mm, name: `${f} radiative (model)`, line: { color: FUEL_COLOR[f], dash: "dash" } }]),
              ...["diffusive_ext", "radiative_ext"].map((mode) => {
                const q = lab.filter((t) => t.outcome === mode);
                return { x: q.map((t) => t.x_o2 * 100), y: q.map((t) => t.d_ext_mm), mode: "markers", name: `FLEX ${mode.replace("_ext", "")}`,
                  marker: { symbol: mode === "diffusive_ext" ? "circle" : "x-thin", size: 9, color: q.map((t) => FUEL_COLOR[t.fuel]), line: { width: 2, color: q.map((t) => FUEL_COLOR[t.fuel]) } },
                  text: q.map((t) => `${t.test_label} ${t.fuel} (${t.split})<br>${t.caption_snippet ?? ""}`), hoverinfo: "text" };
              })]} layout={{ xaxis: { title: { text: "O₂ (mole %)" } }, yaxis: { title: { text: "extinction diameter (mm, log)" }, type: "log" } }} />
            <p className="px-2 text-[12px] text-faint">The <Term k="LOI" /> is where the diffusive and radiative curves meet. Model: heptane {sig(LOI["n-heptane"].loi * 100)}% (published ≈15%, fails), methanol {sig(LOI.methanol.loi * 100)}% (≈12%, passes) <SourcePill id="dietrich-2014" /></p>
          </div>
        )}
        <details className="border border-line p-2"><summary className="cursor-pointer text-[13px] text-mute">View data rows ({cur.parity.length})</summary>
          <div className="max-h-80 overflow-y-auto"><table className="data"><thead><tr><th>test</th><th>fuel</th><th>diluent</th><th>O₂</th><th>kPa</th><th>measured</th><th>predicted</th><th>locator</th></tr></thead>
            <tbody>{cur.parity.map((p: any) => <tr key={p.id}><td className="num">{p.id}</td><td>{p.fuel}</td><td>{p.diluent}</td><td className="num">{p.x_o2}</td><td className="num">{sig(p.P_kPa)}</td><td className="num">{sig(p.obs)}</td><td className="num">{sig(p.pred)}</td><td className="text-[12px] text-mute">{p.locator} <SourcePill id={p.source_id} /></td></tr>)}</tbody></table></div></details>
      </section>
    </div>
  );
}
