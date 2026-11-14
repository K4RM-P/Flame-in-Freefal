"use client";
import { SuppressionFraming } from "@/components/SuppressionFraming";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Plot } from "@/components/Plot";
import { Tex } from "@/components/Tex";
import { Band, SourcePill, ValidityBadges, fmt } from "@/components/bits";
import { Caveat } from "@/components/Nav";
import { EQUATIONS } from "@/lib/equations";
import { useMission } from "@/lib/store";
import { download, reportMarkdown } from "@/lib/report";
import { linspace } from "@/lib/physics/numerics";
import * as M from "@/lib/physics/models";
import * as D from "@/lib/physics/droplet";
import { atmosphere } from "@/lib/physics/thermo";

const TABS = ["spread", "droplet", "suppression", "gravity", "habitat", "smoke", "boundary"];
type Num = Record<string, number>;
interface Slider { k: string; label: string; min: number; max: number; step: number }

export function ModelPage({ id }: { id: string }) {
  const m = useMission();
  const [mat, setMat] = useState(id === "habitat" ? "cotton" : "sibal");
  const [fuelName, setFuel] = useState("n-heptane");
  const [agent, setAgent] = useState("CO2");
  const [dil, setDil] = useState("N2");
  const [p, setP] = useState<Num>({ thickness_mm: 10, d0_mm: 3, x_dil: 0, Q_kW: 5, t_burn_s: 180, growth_s: 0, transport_s: 120, N0_e12: 1, d0_nm: 100 });
  const S = (k: string, v: number) => setP((q) => ({ ...q, [k]: v }));

  const result = useMemo(() => {
    switch (id) {
      case "spread": return M.runSpread(mat, m.x_o2, m.P_kPa, m.flow_cm_s, mat === "sibal" ? null : mat === "cotton" ? p.thickness_mm / 10 : p.thickness_mm, m.gravity_g);
      case "droplet": return M.runDroplet(fuelName, m.x_o2, m.P_kPa, p.d0_mm, dil, dil === "N2" ? 0 : p.x_dil);
      case "suppression": return M.runSuppression(fuelName, m.x_o2, m.P_kPa, agent);
      case "gravity": return M.runGravity(m.x_o2, m.P_kPa, m.flow_cm_s, m.gravity_g, mat);
      case "habitat": return M.runHabitat(mat, m.x_o2, m.P_kPa, m.V_m3, p.Q_kW, p.t_burn_s, 1800, p.growth_s);
      case "smoke": return M.runSmoke(p.transport_s, p.N0_e12 * 1e12, p.d0_nm, m.P_kPa);
      default: return null;
    }
  }, [id, mat, fuelName, agent, dil, p, m.x_o2, m.P_kPa, m.flow_cm_s, m.gravity_g, m.V_m3]);

  const sliders: Slider[] = {
    spread: mat === "sibal" ? [] : [{ k: "thickness_mm", label: mat === "cotton" ? "thickness (×0.1 mm)" : "thickness mm", min: 0.5, max: 25, step: 0.5 }],
    droplet: [{ k: "d0_mm", label: "initial diameter mm", min: 0.5, max: 6, step: 0.05 }, ...(dil !== "N2" ? [{ k: "x_dil", label: `${dil} mole fraction`, min: 0, max: 0.5, step: 0.01 }] : [])],
    habitat: [{ k: "Q_kW", label: "peak HRR kW", min: 0.5, max: 30, step: 0.5 }, { k: "t_burn_s", label: "burn duration s", min: 10, max: 1200, step: 10 }, { k: "growth_s", label: "t² growth time s (0 = constant)", min: 0, max: 600, step: 10 }],
    smoke: [{ k: "transport_s", label: "transport time s", min: 1, max: 1800, step: 1 }, { k: "N0_e12", label: "N₀ (×10¹² m⁻³)", min: 0.1, max: 100, step: 0.1 }, { k: "d0_nm", label: "initial diameter nm", min: 20, max: 400, step: 5 }],
  }[id] ?? [];

  const plot = useMemo(() => modelPlot(id, m, mat, fuelName, agent, p, result), [id, m, mat, fuelName, agent, p, result]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 text-sm">{TABS.map((t) => <Link key={t} href={`/models/${t}`} className={`btn ${t === id ? "border-ink text-ink" : ""}`}>{t}</Link>)}</div>
      <Caveat />
      {!result ? (
        <div className="card space-y-2">
          <h1 className="text-xl font-semibold">Physics-informed flammability boundary (U7) — not built yet</h1>
          <p className="text-sm text-mute">Needs burn/extinct outcomes for solids (BASS-II, Saffire, BRE). Those are only in paper figures; digitization is listed in
            docs/HUMAN_TASKS.md. We do not ship a classifier trained on no data. The console shows the de Ris spread map and the empirical low-flow quench limit instead.</p>
          <div><SourcePill id="bass2-sci-rep-2017" /><SourcePill id="dehghani-bre" /><SourcePill id="ntrs-20180005168" /></div>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <section className="card space-y-3">
            <h1 className="text-xl font-semibold capitalize">{id} calculator</h1>
            <p className="text-xs text-mute">Atmosphere, flow, gravity and volume come from the Mission Bar above.</p>
            {(id === "spread" || id === "gravity" || id === "habitat") && (
              <label className="flex flex-col text-sm"><span className="label">Material</span>
                <select value={mat} onChange={(e) => setMat(e.target.value)}>
                  {(id === "habitat" ? ["cotton", "pmma", "n-heptane", "methanol", "sibal"] : ["sibal", "cotton", "pmma"]).map((k) => <option key={k}>{k}</option>)}
                </select></label>)}
            {(id === "droplet" || id === "suppression") && (
              <label className="flex flex-col text-sm"><span className="label">Fuel</span>
                <select value={fuelName} onChange={(e) => setFuel(e.target.value)}>
                  {(id === "droplet" ? ["n-heptane", "methanol"] : ["n-heptane", "methanol", "pmma", "cotton"]).map((k) => <option key={k}>{k}</option>)}
                </select></label>)}
            {id === "suppression" && (
              <label className="flex flex-col text-sm"><span className="label">Agent</span>
                <select value={agent} onChange={(e) => setAgent(e.target.value)}>{["CO2", "N2", "HE"].map((k) => <option key={k}>{k}</option>)}</select></label>)}
            {id === "droplet" && (
              <label className="flex flex-col text-sm"><span className="label">Added diluent</span>
                <select value={dil} onChange={(e) => setDil(e.target.value)}>{["N2", "CO2", "HE"].map((k) => <option key={k}>{k}</option>)}</select></label>)}
            {sliders.map((s) => (
              <label key={s.k} className="block text-sm"><span className="label">{s.label}: <span className="num text-ink">{p[s.k]}</span></span>
                <input type="range" className="w-full" min={s.min} max={s.max} step={s.step} value={p[s.k]} onChange={(e) => S(s.k, Number(e.target.value))} /></label>
            ))}
            <div className="border-t border-line pt-3">
              <div className="label">Result</div>
              <button data-receipt className="num block text-left text-[32px]" onClick={() => useMission.setState({ drawer: { kind: "receipt", result, title: `${id} model` } })}>{fmt(result.value, 3)} <span className="text-[14px] text-mute">{result.units}</span></button>
              <Band r={result} d={4} />
              <div className="mt-2"><ValidityBadges r={result} /></div>
              {result.validity.note && <p className="mt-1 text-xs text-warn">{result.validity.note}</p>}
            </div>
            <table className="data"><tbody>
              {Object.entries(result.extra).filter(([, v]) => typeof v === "number" || typeof v === "boolean" || typeof v === "string").map(([k, v]) => (
                <tr key={k}><td className="text-mute">{k}</td><td className="num">{typeof v === "number" ? fmt(v, 4) : String(v)}</td></tr>
              ))}
            </tbody></table>
            <button className="btn" onClick={() => download(`emberatlas-${id}-report.md`, reportMarkdown(result, `${id} model`))} data-testid="export">Export report (Markdown)</button>
            {id === "suppression" && <SuppressionFraming r={result} />}
          </section>
          <section className="card lg:col-span-2">
            {plot && <Plot data={plot.data} layout={plot.layout} height={380} />}
            <details open className="mt-3"><summary className="label cursor-pointer">Show equations</summary>
              {result.equation_ids.filter((e) => EQUATIONS[e]).map((e) => (
                <div key={e} className="mt-2 rounded border border-line p-2"><div className="text-xs text-mute">{e} · {EQUATIONS[e].text} <SourcePill id={EQUATIONS[e].ref} /></div><Tex tex={EQUATIONS[e].tex} block /></div>
              ))}
            </details>
            <div className="mt-3"><span className="label">Assumptions</span><ul className="ml-4 list-disc text-sm text-mute">{result.assumptions.map((a) => <li key={a}>{a}</li>)}</ul></div>
            <div className="mt-2">{result.sources.map((s) => <SourcePill key={s} id={s} />)}</div>
          </section>
        </div>
      )}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function modelPlot(id: string, m: any, mat: string, fuelName: string, agent: string, p: Num, r: M.ModelResult | null): { data: any[]; layout: any } | null {
  if (!r) return null;
  if (id === "spread") {
    const flows = linspace(0.5, 60, 50);
    const th = mat === "sibal" ? null : mat === "cotton" ? p.thickness_mm / 10 : p.thickness_mm;
    const y = flows.map((u) => M.runSpread(mat, m.x_o2, m.P_kPa, u, th, 0, "opposed", 1).value);
    return { data: [{ x: flows, y, name: "V_f (µg, forced flow)", line: { color: "#E69F00" } },
      { x: [r.extra.V_eq_cm_s], y: [r.value], mode: "markers", marker: { size: 12, symbol: "cross", color: "#9AA1B2" }, name: "mission (g-equivalent flow)" }],
      layout: { xaxis: { title: { text: "relative flow cm/s" } }, yaxis: { title: { text: "spread mm/s" } } } };
  }
  if (id === "droplet") {
    const xs = linspace(0.1, 0.45, 50);
    const dd: (number | null)[] = [], dr: (number | null)[] = [];
    for (const x of xs) { const e = D.extinctionDiameters(fuelName, atmosphere(x), m.P_kPa * 1e3, M.T_AMB); dd.push(e[0] ? e[0] * 1e3 : null); dr.push(e[1] ? e[1] * 1e3 : null); }
    return { data: [{ x: xs.map((x) => x * 100), y: dd, name: "diffusive extinction d", line: { color: "#56B4E9" } },
      { x: xs.map((x) => x * 100), y: dr, name: "radiative extinction d", line: { color: "#009E73" } },
      { x: [m.x_o2 * 100], y: [p.d0_mm], mode: "markers", marker: { size: 12, color: "#E69F00" }, name: "your droplet d₀" }],
      layout: { xaxis: { title: { text: "O₂ mole % (O₂/N₂)" } }, yaxis: { title: { text: "droplet diameter mm" }, type: "log" } } };
  }
  if (id === "suppression") {
    const xs = linspace(0.15, 0.45, 25);
    const ug = xs.map((x) => M.runSuppression(fuelName, x, m.P_kPa, agent, 1).extra.x_agent_ug as number | null);
    const g1 = xs.map((x) => M.runSuppression(fuelName, x, m.P_kPa, agent, 1).extra.x_agent_1g as number);
    return { data: [{ x: xs.map((x) => x * 100), y: ug.map((v) => (v == null ? null : v * 100)), name: "µg-calibrated T_crit", line: { color: "#E69F00" } },
      { x: xs.map((x) => x * 100), y: g1.map((v) => v * 100), name: "1 g reference", line: { color: "#8b95a7", dash: "dash" } }],
      layout: { xaxis: { title: { text: "base O₂ %" } }, yaxis: { title: { text: `${agent} needed, mole %` } } } };
  }
  if (id === "gravity") {
    const gs = linspace(0, 1, 40);
    const y = gs.map((g) => M.runGravity(m.x_o2, m.P_kPa, m.flow_cm_s, g, mat).extra.u_b_cm_s as number);
    return { data: [{ x: gs, y, name: "u_b (bounded estimate)", line: { color: "#56B4E9" } }],
      layout: { xaxis: { title: { text: "g / g₀" } }, yaxis: { title: { text: "buoyant velocity cm/s" } },
        shapes: [0.165, 0.378].map((g) => ({ type: "line", x0: g, x1: g, yref: "paper", y0: 0, y1: 1, line: { dash: "dot", color: "#8b95a7" } })) } };
  }
  if (id === "habitat") {
    const s = r.extra.series as { t: number[]; T: number[]; P: number[]; x_o2: number[]; x_co2: number[]; x_co: number[] };
    const t = s.t.map((x) => x / 60);
    return { data: [{ x: t, y: s.T.map((T) => T - 273.15), name: "T °C", line: { color: "#E69F00" } },
      { x: t, y: s.P.map((P) => P / 1e3), name: "P kPa", yaxis: "y2", line: { color: "#9AA1B2" } },
      { x: t, y: s.x_co2.map((x) => x * 100), name: "CO₂ %", yaxis: "y3", line: { color: "#56B4E9" } },
      { x: t, y: s.x_co.map((x) => x * 1e6), name: "CO ppm", yaxis: "y4", line: { color: "#009E73" } }],
      layout: { xaxis: { title: { text: "minutes" }, domain: [0, 0.82] }, yaxis: { title: { text: "T °C" } },
        yaxis2: { overlaying: "y", side: "right", title: { text: "kPa" }, gridcolor: "rgba(0,0,0,0)" },
        yaxis3: { overlaying: "y", side: "right", position: 0.9, anchor: "free", title: { text: "CO₂ %" }, gridcolor: "rgba(0,0,0,0)" },
        yaxis4: { overlaying: "y", side: "right", position: 0.98, anchor: "free", title: { text: "CO ppm" }, gridcolor: "rgba(0,0,0,0)" } } };
  }
  if (id === "smoke") {
    const ts = linspace(1, 1800, 60);
    const runs = ts.map((t) => M.runSmoke(t, p.N0_e12 * 1e12, p.d0_nm, m.P_kPa));
    return { data: [{ x: ts, y: runs.map((q) => q.extra.d10_nm), name: "d10", line: { color: "#56B4E9" } },
      { x: ts, y: runs.map((q) => q.value), name: "d30", line: { color: "#E69F00" } },
      { x: ts, y: runs.map((q) => q.extra.d43_nm), name: "d43", line: { color: "#009E73" } }],
      layout: { xaxis: { title: { text: "aging time s" } }, yaxis: { title: { text: "diameter nm" } },
        shapes: [{ type: "rect", xref: "paper", x0: 0, x1: 1, y0: 200, y1: 400, fillcolor: "rgba(63,182,139,0.1)", line: { width: 0 } }] } };
  }
  return null;
}
