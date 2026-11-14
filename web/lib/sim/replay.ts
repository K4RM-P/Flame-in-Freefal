// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Saffire replay error: simulated vs measured PSI-100 telemetry on the overlapping time window.
import type { Telemetry } from "./params";
import type { CabinState, SimResult } from "./types";

export interface ChannelError { n: number; rmse: number; mape: number | null; mae: number; bias: number; units: string; t_from_s: number; t_to_s: number }
export type ReplayError = Partial<Record<"T_K" | "x_o2" | "x_co2" | "P_Pa", ChannelError>>;

function interp(t: number[], y: number[], x: number): number {
  if (x <= t[0]) return y[0];
  if (x >= t[t.length - 1]) return y[y.length - 1];
  let lo = 0, hi = t.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (t[m] <= x) lo = m; else hi = m; }
  return y[lo] + ((y[hi] - y[lo]) * (x - t[lo])) / (t[hi] - t[lo]);
}

/** bias = mean(sim − measured). Telemetry times are seconds on the simulation clock (t = 0 at ignition). */
export function replayError(sim: SimResult, tel: Telemetry): ReplayError | null {
  const out: ReplayError = {};
  const tEnd = sim.t[sim.t.length - 1];
  const units: Record<string, string> = { T_K: "K", x_o2: "mol/mol", x_co2: "mol/mol", P_Pa: "Pa" };
  for (const ch of ["T_K", "x_o2", "x_co2", "P_Pa"] as const) {
    const meas = tel[ch];
    if (!meas?.length) continue;
    const simY = sim.state.map((s: CabinState) => s[ch]);
    const res: number[] = [], ts: number[] = [];
    tel.t.forEach((tt, i) => { if (tt >= 0 && tt <= tEnd && Number.isFinite(meas[i])) { res.push(interp(sim.t, simY, tt) - meas[i]); ts.push(tt); } });
    if (!res.length) continue;
    out[ch] = {
      n: res.length, units: units[ch], t_from_s: ts[0], t_to_s: ts[ts.length - 1],
      rmse: Math.sqrt(res.reduce((a, r) => a + r * r, 0) / res.length),
      mape: meas.reduce((sum, value, i) => {
        const tt = tel.t[i];
        if (tt < 0 || tt > tEnd || !Number.isFinite(value) || value === 0) return sum;
        return sum + Math.abs(interp(sim.t, simY, tt) - value) / Math.abs(value);
      }, 0) / (meas.reduce((n, value, i) => tel.t[i] >= 0 && tel.t[i] <= tEnd && Number.isFinite(value) && value !== 0 ? n + 1 : n, 0) || 1) * 100,
      mae: res.reduce((a, r) => a + Math.abs(r), 0) / res.length,
      bias: res.reduce((a, r) => a + r, 0) / res.length,
    };
  }
  return Object.keys(out).length ? out : null;
}
