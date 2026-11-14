"use client";
import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { PlotParams } from "react-plotly.js";
import { useMission } from "@/lib/store";
import { plotTheme } from "@/lib/ui/plotTheme";

const Plotly: ComponentType<PlotParams> = dynamic<PlotParams>(
  async () => {
    const plotly = await import("plotly.js-dist-min");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const factory = (await import("react-plotly.js/factory")).default;
    return factory(plotly.default ?? plotly);
  },
  { ssr: false, loading: () => <div className="grid h-full min-h-[200px] place-items-center text-xs text-mute">loading plot…</div> },
);

export function Plot({ data, layout, height = 340, label, theme: forced, ...rest }: Partial<PlotParams> & { height?: number; label?: string; theme?: "dark" | "light" }) {
  const theme = useMission((s) => s.theme);
  const t = plotTheme(forced ?? theme);
  return (
    <div role="img" aria-label={label ?? "chart"}>
    <Plotly
      data={data ?? []}
      layout={{
        ...t.layout, height, ...layout,
        xaxis: { ...t.axis, ...(layout?.xaxis ?? {}) }, yaxis: { ...t.axis, ...(layout?.yaxis ?? {}) },
      }}
      config={{ displaylogo: false, responsive: true, modeBarButtonsToRemove: ["lasso2d", "select2d", "zoomIn2d", "zoomOut2d", "autoScale2d", "toggleSpikelines", "hoverClosestCartesian", "hoverCompareCartesian"] }}
      style={{ width: "100%" }}
      useResizeHandler
      {...rest}
    />
    </div>
  );
}
