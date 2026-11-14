"use client";
import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { PlotParams } from "react-plotly.js";

const Plotly: ComponentType<PlotParams> = dynamic<PlotParams>(
  async () => {
    const plotly = await import("plotly.js-dist-min");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const factory = (await import("react-plotly.js/factory")).default;
    return factory(plotly.default ?? plotly);
  },
  { ssr: false, loading: () => <div className="grid h-full min-h-[200px] place-items-center text-xs text-mute">loading plot…</div> },
);

export const AXIS = { gridcolor: "#232b3a", zerolinecolor: "#232b3a", linecolor: "#232b3a", tickfont: { size: 11 } };
export function Plot({ data, layout, height = 340, ...rest }: Partial<PlotParams> & { height?: number }) {
  return (
    <Plotly
      data={data ?? []}
      layout={{
        paper_bgcolor: "rgba(0,0,0,0)", plot_bgcolor: "rgba(0,0,0,0)", font: { color: "#e6e9ef", family: "Inter, sans-serif", size: 12 },
        margin: { l: 56, r: 16, t: 24, b: 48 }, height, legend: { orientation: "h", y: -0.22, font: { size: 11 } }, ...layout,
        xaxis: { ...AXIS, ...(layout?.xaxis ?? {}) }, yaxis: { ...AXIS, ...(layout?.yaxis ?? {}) },
      }}
      config={{ displaylogo: false, responsive: true, modeBarButtonsToRemove: ["lasso2d", "select2d"] }}
      style={{ width: "100%" }}
      useResizeHandler
      {...rest}
    />
  );
}
