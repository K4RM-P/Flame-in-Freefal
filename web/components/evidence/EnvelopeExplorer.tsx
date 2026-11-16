"use client";
// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Material envelope explorer (Evidence): every PSI-tested solid's O₂ × pressure (or O₂ × flow) test range on one chart,
// with mission atmospheres and the user's cabin (from the simulator link) plotted against it, plus a coverage table.
// Accent is used only for the mission/cabin marker (design rule); materials use the Okabe–Ito palette.
import { useEffect, useMemo, useState } from "react";
import type { PlotParams } from "react-plotly.js";
type Data = PlotParams["data"][number];
type Shape = NonNullable<NonNullable<PlotParams["layout"]>["shapes"]>[number];
import { Plot } from "@/components/Plot";
import { BRE_PRESSURE_NOTE, breO2, coverage, materialBoxes, missionPoints, pointFromQuery, type CabinPoint } from "@/lib/evidence/envelope";
import { ACCENT, OKABE_ITO } from "@/lib/ui/palette";

type Axis = "P" | "flow";

export function EnvelopeExplorer() {
  const boxes = useMemo(() => materialBoxes(), []);
  const missions = useMemo(() => missionPoints(), []);
  const breLevels = useMemo(() => breO2(), []);
  const [axis, setAxis] = useState<Axis>("P");
  const [user, setUser] = useState<CabinPoint | null>(null);
  const [sel, setSel] = useState<string>("LunarHabitat");
  useEffect(() => {
    const p = pointFromQuery(new URLSearchParams(window.location.search));
    if (p) { setUser(p); setSel("user"); }
  }, []);
  const point: CabinPoint | null = sel === "user" ? user : (() => { const m = missions.find((x) => x.id === sel); return m ? { label: m.name, x_o2: m.x_o2, P_kPa: m.P_kPa, flow_cm_s: m.flow_cm_s } : null; })();
  const cov = useMemo(() => (point ? coverage(point, boxes) : []), [point, boxes]);
  const yOf = (b: { P_kPa: [number, number] | null; flow_cm_s: [number, number] | null }) => (axis === "P" ? b.P_kPa : b.flow_cm_s);

  const data: Data[] = [];
  boxes.forEach((b, i) => {
    const y = yOf(b);
    if (!b.o2 || !y) return;
    const c = OKABE_ITO[i % OKABE_ITO.length];
    const hover = `<b>${b.name}</b><br>O₂ ${b.o2[0].toFixed(1)}–${b.o2[1].toFixed(1)} %<br>${axis === "P" ? `pressure ${y[0].toFixed(0)}–${y[1].toFixed(0)} kPa` : `flow ${y[0].toFixed(1)}–${y[1].toFixed(1)} cm/s`}<br>${b.investigations.join(", ")}${b.n_tests ? ` · ${b.n_tests} tests` : ""}<extra></extra>`;
    const flat = Math.abs(y[1] - y[0]) < 1e-9;
    // Display-only offset so bars tested at the same single pressure do not hide each other (disclosed under the chart).
    const off = flat ? (i - (boxes.length - 1) / 2) * (axis === "P" ? 1.6 : 0.25) : 0;
    data.push(flat
      ? { type: "scatter", mode: "lines", x: [b.o2[0], b.o2[1]], y: [y[0] + off, y[1] + off], line: { color: c, width: 6 }, opacity: 0.9, name: b.name, hovertemplate: hover }
      : { type: "scatter", mode: "lines", x: [b.o2[0], b.o2[1], b.o2[1], b.o2[0], b.o2[0]], y: [y[0], y[0], y[1], y[1], y[0]], fill: "toself", fillcolor: `${c}33`, line: { color: c, width: 1.5 }, name: b.name, hovertemplate: hover });
  });
  // ACME BRE O₂ levels: vertical dashed marks (pressure not identified in the PSI-20 table).
  const shapes: Partial<Shape>[] = breLevels.map((l) => ({ type: "line", xref: "x", yref: "paper", x0: l.o2, x1: l.o2, y0: 0, y1: 1, line: { color: "#999999", width: 1, dash: "dot" } }));
  data.push({ type: "scatter", mode: "markers", x: breLevels.map((l) => l.o2), y: breLevels.map(() => null), marker: { color: "#999999", symbol: "line-ns-open" }, name: "ACME BRE gas-burner O₂ (PSI-20; pressure not identified)", hoverinfo: "skip", showlegend: true });
  const my = (m: { P_kPa: number; flow_cm_s: number | null }) => (axis === "P" ? m.P_kPa : m.flow_cm_s);
  // Missions sharing a point (ISS + Orion; lunar habitat + rover + Mars) are one marker with one combined label.
  const groups = new Map<string, typeof missions>();
  for (const m of missions.filter((x) => x.id !== sel)) { const k = `${m.x_o2}|${my(m)}`; groups.set(k, [...(groups.get(k) ?? []), m]); }
  const near = (m: { x_o2: number; P_kPa: number; flow_cm_s: number | null }) => point && m.x_o2 === point.x_o2 && my(m) === my(point);
  const G = [...groups.values()];
  data.push({ type: "scatter", mode: "text+markers", x: G.map((g) => g[0].x_o2), y: G.map((g) => my(g[0])), text: G.map((g) => (near(g[0]) ? "" : g.map((m) => m.name.split(" (")[0].replace("International Space Station", "ISS").replace("Orion crew module", "Orion")).join(" · "))), textposition: "top center",
    textfont: { size: 10 }, marker: { size: 9, color: "rgba(0,0,0,0)", line: { color: "#A1A1A1", width: 1.5 } }, name: "Mission atmospheres (missions.json)",
    hovertemplate: G.map((g) => `${g.map((m) => `<b>${m.name}</b> · ${m.gravity_g} g · source: ${m.source}`).join("<br>")}<br>${g[0].x_o2.toFixed(1)} % O₂ · ${g[0].P_kPa} kPa · ${g[0].flow_cm_s} cm/s<extra></extra>`) });
  if (point && my(point) !== null) data.push({ type: "scatter", mode: "text+markers", x: [point.x_o2], y: [my(point)], text: [point.label], textposition: "bottom center", textfont: { size: 11 },
    marker: { size: 14, color: ACCENT, symbol: sel === "user" ? "star" : "circle", line: { color: "#0A0A0A", width: 1 } }, name: sel === "user" ? "Your cabin" : "Selected mission",
    hovertemplate: `<b>${point.label}</b><br>${point.x_o2.toFixed(1)} % O₂ · ${point.P_kPa} kPa${point.flow_cm_s !== null ? ` · ${point.flow_cm_s} cm/s` : ""}<extra></extra>` });

  const inside = cov.filter((c) => c.inside);
  return (
    <div className="space-y-4" data-testid="envelope-explorer">
      <div className="flex flex-wrap items-center gap-2 text-[13px]">
        <span className="ea-meta">Y axis</span>
        <div role="radiogroup" aria-label="Y axis" className="flex gap-1">
          {(["P", "flow"] as const).map((a) => <button key={a} type="button" role="radio" aria-checked={axis === a} data-testid={`env-axis-${a}`} onClick={() => setAxis(a)}
            className={`h-8 rounded-[6px] border px-3 ${axis === a ? "border-mute bg-surface2 text-ink" : "border-line text-mute"}`}>{a === "P" ? "Pressure (kPa)" : "Air flow (cm/s)"}</button>)}
        </div>
        <label className="ml-auto flex items-center gap-2"><span className="ea-meta">Cabin</span>
          <select value={sel} onChange={(e) => setSel(e.target.value)} className="h-8 text-[13px]" data-testid="env-cabin">
            {user && <option value="user">{user.label} (from simulator)</option>}
            {missions.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </label>
      </div>
      <Plot data={data} height={420} label="Tested envelope per material versus mission atmospheres"
        layout={{ shapes, xaxis: { title: { text: "Oxygen, % (mole)" }, range: [10, 42] }, yaxis: axis === "P" ? { title: { text: "Pressure, kPa" }, range: [40, 115] } : { title: { text: "Air flow, cm/s" }, rangemode: "tozero" }, legend: { orientation: "h", y: -0.28 } }} />
      <p className="text-[12px] text-faint">Bars and boxes are the ranges NASA actually tested each material at (PSI rows and investigation cards; pressure ranges are still TODO_VERIFY). A one-pressure campaign is drawn as a bar, not stretched into a box; bars at the same pressure are offset slightly so each stays visible (hover for exact values). {BRE_PRESSURE_NOTE}</p>
      {point && <div className="overflow-x-auto">
        <p className="mb-2 text-[14px]" data-testid="env-verdict"><b>{point.label}</b>: {inside.length ? <>inside the tested range of {inside.map((c) => c.name).join(", ")}.</> : <span className="text-warn">outside the tested range of every PSI solid. Results here are extrapolations.</span>}</p>
        <table className="data w-full min-w-[34rem]" data-testid="env-coverage">
          <thead><tr><th scope="col">material</th><th scope="col">O₂</th><th scope="col">pressure</th><th scope="col">flow</th><th scope="col">gap</th></tr></thead>
          <tbody>{cov.map((c) => <tr key={c.key} className={point.material && point.material === c.key ? "bg-surface2" : ""}>
            <td>{c.name}{point.material === c.key && <span className="ml-1 text-[11px] text-faint">(in your cabin)</span>}</td>
            {[c.o2, c.P, c.flow].map((v, i) => <td key={i} className={v === false ? "text-warn" : v === true ? "text-ok" : "text-faint"}>{v === true ? "● tested" : v === false ? "✕ outside" : "∅ no data"}</td>)}
            <td className="text-[12px] text-mute">{c.gap || "—"}</td>
          </tr>)}</tbody>
        </table>
      </div>}
    </div>
  );
}
