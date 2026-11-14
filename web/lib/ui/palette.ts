// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Okabe–Ito palette, fixed per investigation everywhere (colour-blind safe).
export const OKABE_ITO = ["#E69F00", "#56B4E9", "#009E73", "#F0E442", "#0072B2", "#D55E00", "#CC79A7"];
const ORDER = ["FLEX", "BASS-II", "Saffire-I-III", "ACME-BRE", "SAME", "BASS", "Saffire-IV-VI"];
export const invColor = (id: string) => OKABE_ITO[Math.max(0, ORDER.indexOf(id)) % OKABE_ITO.length];
export const FUEL_COLOR: Record<string, string> = { "n-heptane": "#E69F00", methanol: "#56B4E9" };
export const ACCENT = "#FF6B35";
export const OUTCOME_SYMBOL: Record<string, string> = { burn: "circle", extinct: "x-thin", cool_flame: "diamond-open", no_ignition: "square-open" };
