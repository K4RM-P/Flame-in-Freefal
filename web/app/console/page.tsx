"use client";
import { useMemo, useState } from "react";
import { Plot } from "@/components/Plot";
import { InfoButton } from "@/components/InfoDrawer";
import { Band, ModelLink, SourcePill, ValidityBadges, fmt } from "@/components/bits";
import { Caveat } from "@/components/Nav";
import { useMission } from "@/lib/store";
import { runHabitat, runSmoke, runSpread, runSuppression, T_AMB } from "@/lib/physics/models";
import * as SP from "@/lib/physics/spread";
import * as G from "@/lib/physics/gravity";
import { atmosphere } from "@/lib/physics/thermo";
import { linspace } from "@/lib/physics/numerics";
import { TEST_POINTS } from "@/lib/testPoints";
import { GRAVITY_PRESETS } from "@/lib/missions";
import { PROPS } from "@/lib/physics/data";

const MATERIALS = [["sibal", "SIBAL fabric (thin)"], ["cotton", "Cotton 0.1 mm (thin)"], ["pmma", "PMMA 10 mm (thick)"]] as const;
const THICK: Record<string, number | null> = { sibal: null, cotton: 0.1, pmma: 10 };
const QUENCH = PROPS.spread.low_flow_quench_cm_s.value as number;

export default function Console() {
  const m = useMission();
  const [mat, setMat] = useState<string>("sibal");
  const [o2Axis, setO2Axis] = useState<"pct" | "kpa">("pct");
  const th = THICK[mat];

  const grid = useMemo(() => {
    const flows = linspace(Math.log10(0.5), Math.log10(60), 36).map((z) => 10 ** z);
    const o2s = linspace(0.12, 0.45, 34);
    const z = o2s.map((x) => flows.map((u) => {
      const atm = atmosphere(x);
      const r0 = SP.spreadRate(mat, atm, m.P_kPa * 1e3, u / 100, T_AMB, th === null ? null : th * 1e-3);
      return r0.V_f * 1e3;
    }));
    return { flows, o2s, z };
  }, [mat, m.P_kPa, th]);

  const spread = useMemo(() => runSpread(mat, m.x_o2, m.P_kPa, m.flow_cm_s, th, m.gravity_g, "opposed", 300), [mat, m.x_o2, m.P_kPa, m.flow_cm_s, th, m.gravity_g]);
  const supp = useMemo(() => runSuppression("n-heptane", m.x_o2, m.P_kPa, "CO2", 200), [m.x_o2, m.P_kPa]);
  const hab = useMemo(() => runHabitat("cotton", m.x_o2, m.P_kPa, m.V_m3, 5, 180, 1800, 0, false, 25), [m.x_o2, m.P_kPa, m.V_m3]);
  const smoke = useMemo(() => runSmoke(120), []);
  const veq = spread.extra.V_eq_cm_s as number;
  const yv = (x: number, p: number) => (o2Axis === "pct" ? x * 100 : x * p);
  const flex = TEST_POINTS.filter((t) => t.diluent === "N2");
  const burn = flex.filter((t) => t.test_end !== "extinction"), ext = flex.filter((t) => t.test_end === "extinction");
  const presetsUb = Object.fromEntries(GRAVITY_PRESETS.map((g) => [g.id, g.g === 0 ? 0 : G.buoyantVelocity(g.g, atmosphere(m.x_o2), m.P_kPa * 1e3, spread.extra.T_f_K as number, T_AMB) * 100]));
  const hover = (t: (typeof flex)[number]) => `${t.test_label} ${t.fuel}<br>O₂ ${t.x_o2} · ${t.pressure_kpa.toFixed(1)} kPa<br>${t.test_end}${t.outcome.includes("_ext") ? ` (${t.outcome})` : ""}<br>${t.source_id} · ${t.locator}`;

  return (
    <div className="space-y-4" data-testid="console">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Fire Risk Console</h1>
        <Caveat />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <section className="card lg:col-span-2">
          <div className="mb-2 flex flex-wrap items-center gap-3 text-sm">
            <span className="label">Flammability map</span>
            <select value={mat} onChange={(e) => setMat(e.target.value)}>{MATERIALS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
            <div className="flex overflow-hidden rounded border border-line text-xs">
              {(["pct", "kpa"] as const).map((a) => <button key={a} onClick={() => setO2Axis(a)} className={`px-2 py-1 ${o2Axis === a ? "bg-accent text-black" : "text-mute"}`}>{a === "pct" ? "O₂ %" : "pO₂ kPa"}</button>)}
            </div>
            <div className="flex overflow-hidden rounded border border-line text-xs">
              {GRAVITY_PRESETS.map((g) => <button key={g.id} onClick={() => m.set({ gravity_g: g.g })} className={`px-2 py-1 ${m.gravity_g === g.g ? "bg-accent text-black" : "text-mute"}`}>{g.label}</button>)}
            </div>
          </div>
          <Plot height={430} data={[
            { type: "contour", x: grid.flows, y: grid.o2s.map((x) => yv(x, m.P_kPa)), z: grid.z, colorscale: [[0, "#121722"], [0.5, "#7a2e14"], [1, "#ff6b35"]],
              contours: { coloring: "heatmap", showlabels: true, labelfont: { size: 10, color: "#e6e9ef" } }, colorbar: { title: { text: "V_f mm/s", side: "right" }, thickness: 10 },
              hovertemplate: "flow %{x:.1f} cm/s<br>O₂ %{y:.1f}<br>V_f %{z:.2f} mm/s (theory)<extra></extra>", name: "de Ris spread (theory)" },
            { type: "scatter", mode: "markers", x: burn.map(() => 0.55), y: burn.map((t) => yv(t.x_o2, t.pressure_kpa)), marker: { symbol: "circle", size: 7, color: "#4ea1ff", line: { color: "#0b0e14", width: 1 } },
              name: "FLEX droplet burned out/disrupted ● (quiescent)", text: burn.map(hover), hoverinfo: "text" },
            { type: "scatter", mode: "markers", x: ext.map(() => 0.62), y: ext.map((t) => yv(t.x_o2, t.pressure_kpa)), marker: { symbol: "x-thin", size: 8, color: "#f5a524", line: { color: "#f5a524", width: 2 } },
              name: "FLEX flame extinguished ✕", text: ext.map(hover), hoverinfo: "text" },
            { type: "scatter", mode: "markers", x: [Math.max(m.flow_cm_s, 0.5)], y: [yv(m.x_o2, m.P_kPa)], marker: { symbol: "circle-open", size: 14, color: "#e6e9ef", line: { width: 2 } }, name: "mission, forced flow only (µg)" },
            { type: "scatter", mode: "markers", x: [Math.max(veq, 0.5)], y: [yv(m.x_o2, m.P_kPa)], marker: { symbol: "cross", size: 16, color: "#ff6b35" }, name: `mission at gravity-equivalent flow (${fmt(veq, 3)} cm/s, bounded)` },
          ]} layout={{
            xaxis: { type: "log", title: { text: "relative opposed flow (cm/s, log)" }, range: [Math.log10(0.5), Math.log10(60)] },
            yaxis: { title: { text: o2Axis === "pct" ? "O₂ mole %" : "pO₂ kPa" } },
            shapes: [{ type: "rect", x0: 0.5, x1: QUENCH, yref: "paper", y0: 0, y1: 1, fillcolor: "rgba(229,72,77,0.10)", line: { width: 0 } }],
            annotations: [{ x: Math.log10(1.5), y: 1.02, yref: "paper", text: `low-flow quench warning < ${QUENCH} cm/s (BASS-II)`, showarrow: false, font: { size: 10, color: "#e5484d" } }],
          }} />
          <p className="mt-1 text-xs text-mute">
            Contours: uncalibrated de Ris theory at {m.P_kPa} kPa (F(Da) off; flammability boundary model U7 awaits BASS-II digitization). Gravity moves the mission
            point to V<sub>r,eq</sub> = U + u<sub>b</sub>: u<sub>b</sub> ≈ Moon {fmt(presetsUb.moon, 2)}, Mars {fmt(presetsUb.mars, 2)}, 1 g {fmt(presetsUb.earth, 2)} cm/s (bounded estimate).
            FLEX points are quiescent droplets, plotted at the left edge; hover for provenance.
          </p>
        </section>

        <div className="space-y-4">
          <Card title="Opposed flame spread" r={spread} main={`${fmt(spread.value)} mm/s`}>
            <div className="text-xs text-mute">band [µg, g-equivalent]: <span className="num">{fmt((spread.extra.band_mm_s as number[])[0])}–{fmt((spread.extra.band_mm_s as number[])[1])} mm/s</span></div>
          </Card>
          <Card title="CO₂ to inert n-heptane" r={supp} main={`${fmt((supp.extra.x_agent_ug as number) * 100, 3)}% µg`}>
            <div className="text-xs text-mute">1 g reference: <span className="num">{fmt((supp.extra.x_agent_1g as number) * 100, 3)}%</span> · base T<sub>ad</sub> {fmt(supp.extra.T_ad_base_K as number, 4)} K</div>
          </Card>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card title={`Habitat: 5 kW cotton fire, 3 min, ${m.V_m3} m³`} r={hab} main={`ΔT ${fmt(hab.value)} K`}>
          <Plot height={200} data={[
            { x: (hab.extra.series as { t: number[] }).t.map((t) => t / 60), y: (hab.extra.series as { T: number[] }).T.map((T) => T - 273.15), name: "T °C", line: { color: "#ff6b35" } },
            { x: (hab.extra.series as { t: number[] }).t.map((t) => t / 60), y: (hab.extra.series as { x_co2: number[] }).x_co2.map((x) => x * 100), name: "CO₂ %", yaxis: "y2", line: { color: "#4ea1ff" } },
          ]} layout={{ margin: { l: 44, r: 44, t: 8, b: 36 }, xaxis: { title: { text: "min" } }, yaxis2: { overlaying: "y", side: "right", gridcolor: "rgba(0,0,0,0)" }, showlegend: true }} />
          <div className="text-xs text-mute">peak ΔP <span className="num">{fmt(hab.extra.peak_dP_kPa as number)}</span> kPa · peak CO <span className="num">{fmt(hab.extra.peak_co_ppm as number)}</span> ppm · min O₂ <span className="num">{fmt((hab.extra.min_x_o2 as number) * 100, 4)}%</span></div>
        </Card>
        <Card title="Smoke reaching a detector after 2 min" r={smoke} main={`${fmt(smoke.value)} nm`}>
          <div className="text-xs text-mute">d10 {fmt(smoke.extra.d10_nm as number)} nm · d43 {fmt(smoke.extra.d43_nm as number)} nm · favoured: <b>{String(smoke.extra.favoured_detector)}</b>. SAME-R evidence: averages mostly 200–400 nm <SourcePill id="same-r" /></div>
        </Card>
      </div>
    </div>
  );
}

function Card({ title, r, main, children }: { title: string; r: ReturnType<typeof runSpread>; main: string; children?: React.ReactNode }) {
  return (
    <section className="card space-y-1.5">
      <div className="flex items-center justify-between"><span className="label">{title}</span><span className="flex items-center gap-2"><ModelLink id={r.model_id} /><InfoButton r={r} /></span></div>
      <div className="flex items-baseline gap-3"><span className="num text-2xl text-accent">{main}</span><Band r={r} /></div>
      <ValidityBadges r={r} />
      {children}
    </section>
  );
}
