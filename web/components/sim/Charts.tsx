"use client";
// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Four time-series charts with p05–p95 bands; B overlays dashed; Saffire replay overlays the real PSI-100 telemetry.
import type { PlotParams } from "react-plotly.js";
import { Plot } from "@/components/Plot";
import { OKABE_ITO } from "@/lib/ui/palette";
import { BAND_OPACITY } from "@/lib/ui/plotTheme";
import type { CabinState, Scenario, SimResult } from "@/lib/sim/types";
import { TELEMETRY } from "./data";

type Field = keyof CabinState;
interface Spec { title: string; unit: string; lines: { f: Field; name: string; k: number; tq?: "T_K" | "x_o2" | "x_co2"; y2?: boolean }[] }
// Display conversions only (engine is SI).
const CONV: Partial<Record<Field, (v: number) => number>> = { T_K: (v) => v - 273.15, x_o2: (v) => v * 100, x_co2: (v) => v * 100, x_co: (v) => v * 1e6, smoke_det: (v) => v * 1e6 };
const conv = (f: Field, v: number) => (CONV[f] ? CONV[f]!(v) : v);
export const CHARTS: Spec[] = [
  { title: "Cabin temperature", unit: "°C", lines: [{ f: "T_K", name: "Temperature", k: 5, tq: "T_K" }] },
  { title: "Oxygen", unit: "% mol", lines: [{ f: "x_o2", name: "O₂", k: 4, tq: "x_o2" }] },
  { title: "CO₂ (%) and CO (ppm)", unit: "CO₂ %", lines: [{ f: "x_co2", name: "CO₂ %", k: 2, tq: "x_co2" }, { f: "x_co", name: "CO ppm", k: 6, y2: true }] },
  { title: "Smoke at the detector", unit: "mg/m³", lines: [{ f: "smoke_det", name: "Smoke", k: 1 }] },
];

const rgba = (hex: string, a: number) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };

export function Charts({ ra, rb, sa, frame, replay, only, height = 220 }: { ra: SimResult; rb: SimResult | null; sa: Scenario; frame: number; replay: boolean; only?: Field; height?: number }) {
  const tl = replay ? TELEMETRY : null;
  return (
    <div className={only ? "h-full" : "grid gap-3 md:grid-cols-2"}>
      {CHARTS.filter((c) => !only || c.lines[0].f === only).map((c) => {
        const data: PlotParams["data"] = [];
        for (const [r, tag, dash] of [[ra, "A", "solid"], [rb, "B", "dash"]] as const) {
          if (!r) continue;
          for (const l of c.lines) {
            const col = OKABE_ITO[l.k];
            const yaxis = l.y2 ? "y2" : "y";
            const band = r.bands?.[l.f];
            if (band) {
              data.push({ x: r.t, y: band.p95.map((v) => conv(l.f, v)), type: "scatter", mode: "lines", line: { width: 0 }, hoverinfo: "skip", showlegend: false, yaxis });
              data.push({ x: r.t, y: band.p05.map((v) => conv(l.f, v)), type: "scatter", mode: "lines", line: { width: 0 }, fill: "tonexty", fillcolor: rgba(col, BAND_OPACITY), name: `${tag} ${l.name} p05–p95`, hoverinfo: "skip", yaxis });
            }
            data.push({ x: r.t, y: (band ? band.p50 : r.state.map((s) => s[l.f] as number)).map((v) => conv(l.f, v)), type: "scatter", mode: "lines", line: { color: col, width: 2, dash }, name: `${rb ? `${tag} ` : ""}${l.name}${band ? " (p50)" : ""}`, yaxis });
          }
        }
        if (tl) for (const l of c.lines) {
          const ys = l.tq ? tl[l.tq] : undefined;
          if (!ys) continue;
          data.push({ x: tl.t, y: ys.map((v) => conv(l.f, v)), type: "scatter", mode: "markers", marker: { color: OKABE_ITO[l.k], size: 4, symbol: "circle-open" },
            name: `${l.name} measured (${tl.source_id})`, yaxis: l.y2 ? "y2" : "y" });
        }
        const thr = c.lines[0].f === "smoke_det" && sa.detection.threshold != null ? sa.detection.threshold * 1e6 : null;
        const tNow = ra.t[frame] ?? 0;
        return (
          <div key={c.title} className={only ? "h-full" : "panel p-2"} data-testid={`chart-${c.lines[0].f}`}>
            {!only && <p className="px-1 text-[13px] font-medium">{c.title}</p>}
            <Plot data={data} height={height} label={`${c.title} versus time`}
              layout={{
                margin: { l: 48, r: c.lines.some((l) => l.y2) ? 48 : 12, t: 28, b: 40 },
                legend: { orientation: "h", x: 0, xanchor: "left", y: 1.02, yanchor: "bottom", font: { size: 11 } },
                xaxis: { title: { text: "time (s)" } }, yaxis: { title: { text: c.unit } },
                ...(c.lines.some((l) => l.y2) && { yaxis2: { overlaying: "y", side: "right", title: { text: "CO ppm" }, showgrid: false } }),
                showlegend: true,
                shapes: [
                  { type: "line", x0: tNow, x1: tNow, yref: "paper", y0: 0, y1: 1, line: { width: 1, dash: "dot", color: "rgba(128,136,156,0.8)" } },
                  ...(thr != null ? [{ type: "line" as const, xref: "paper" as const, x0: 0, x1: 1, y0: thr, y1: thr, line: { width: 1, dash: "dash" as const, color: "rgba(128,136,156,0.8)" } }] : []),
                ],
              }} />
          </div>
        );
      })}
    </div>
  );
}
