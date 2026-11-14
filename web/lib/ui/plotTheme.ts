// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// One Plotly template for both themes.
export function plotTheme(theme: "dark" | "light") {
  const ink = theme === "dark" ? "#E7E9EE" : "#2B2B2B";
  const grid = theme === "dark" ? "#232836" : "#E4DDD0";
  const axis = { gridcolor: grid, gridwidth: 0.5, zerolinecolor: grid, linecolor: grid, tickfont: { family: "JetBrains Mono, monospace", size: 11 }, title: { font: { size: 12 } } };
  return {
    layout: {
      paper_bgcolor: "rgba(0,0,0,0)", plot_bgcolor: "rgba(0,0,0,0)", font: { color: ink, family: "Inter, sans-serif", size: 12 },
      margin: { l: 56, r: 16, t: 16, b: 48 }, legend: { orientation: "h" as const, y: -0.22, font: { size: 11 } },
      hoverlabel: { font: { family: "JetBrains Mono, monospace", size: 11 }, bgcolor: theme === "dark" ? "#171B24" : "#FFFDF8", bordercolor: grid },
    },
    axis, ink, grid,
  };
}
export const BAND_OPACITY = 0.18;
