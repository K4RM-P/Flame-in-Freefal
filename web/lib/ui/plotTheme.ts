// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// One Plotly template for both themes (token colours: #0A0A0A bg, #262626 grid, JetBrains Mono ticks).
const MONO = "JetBrains Mono Variable, JetBrains Mono, ui-monospace, monospace";
export function plotTheme(theme: "dark" | "light") {
  const ink = theme === "dark" ? "#EDEDED" : "#0A0A0A";
  const grid = theme === "dark" ? "#262626" : "#EAEAEA";
  const axis = { gridcolor: grid, gridwidth: 0.5, zerolinecolor: grid, linecolor: grid, tickfont: { family: MONO, size: 11, color: theme === "dark" ? "#A1A1A1" : "#525252" }, title: { font: { size: 12 } } };
  return {
    layout: {
      paper_bgcolor: "rgba(0,0,0,0)", plot_bgcolor: "rgba(0,0,0,0)", font: { color: ink, family: "Inter Variable, Inter, system-ui, sans-serif", size: 12 },
      margin: { l: 56, r: 16, t: 16, b: 48 }, legend: { orientation: "h" as const, y: -0.22, font: { size: 11, family: MONO } },
      hoverlabel: { font: { family: MONO, size: 11 }, bgcolor: theme === "dark" ? "#171717" : "#FFFFFF", bordercolor: grid },
    },
    axis, ink, grid,
  };
}
export const BAND_OPACITY = 0.18;
