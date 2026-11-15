// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Display rounding only (§5.6). p50: 2 s.f. if the band is wider than ±20 % of it, else 3; never more than 4.
const THIN = " ";
export function sig(x: number | null | undefined, s = 3): string {
  if (x == null || !Number.isFinite(x)) return "—";
  if (x === 0) return "0";
  const a = Math.abs(x);
  if (a >= 1e5 || a < 1e-3) return x.toExponential(Math.max(0, s - 1)).replace("e", "×10^").replace(/\^\+?(-?\d+)/, (_, e) => `^${e}`);
  const r = Number(x.toPrecision(Math.min(s, 4)));
  const [i, d] = String(r).split(".");
  return i.replace(/\B(?=(\d{3})+(?!\d))/g, THIN) + (d ? `.${d}` : "");
}
/** Number + unit joined by a narrow no-break space (U+202F): a plain space renders full-width in the mono number font ("322  s"). */
export const UNIT_SEP = "\u202F";
export const withUnit = (x: number | null | undefined, units: string, s = 3) => (units ? `${sig(x, s)}${UNIT_SEP}${units}` : sig(x, s));
export function bandSig(p50: number, p05: number, p95: number): number {
  const half = Math.max(Math.abs(p95 - p50), Math.abs(p50 - p05));
  return Math.abs(p50) > 0 && half / Math.abs(p50) > 0.2 ? 2 : 3;
}
export const fmtBand = (p05: number, p95: number, s = 2) => `(${sig(p05, s)}–${sig(p95, s)})`;
export const KPA_PER_PSI = 6.894757293168;
export const psia = (kPa: number) => kPa / KPA_PER_PSI;
export function o2Basis(x_o2: number, P_kPa: number) {
  return `${sig(x_o2 * 100, 3)}% O₂ (mole) · ${sig(x_o2 * P_kPa, 3)} kPa p_O₂`;
}
export function gravityName(g: number) {
  return g === 0 ? "microgravity" : g === 0.165 ? "lunar gravity" : g === 0.378 ? "Mars gravity" : g === 1 ? "1 g" : `${g} g`;
}
