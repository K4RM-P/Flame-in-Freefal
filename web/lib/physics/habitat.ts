// Port of emberphys/habitat.py (HA1-HA4); adaptive RK45 (Dormand-Prince) like scipy's default.
import { LIMITS, fuel, prop, v } from "./data";
import { R, cpMolar, formulaMass, molarMass } from "./thermo";

export const EQ = ["HA1", "HA2", "HA3", "HA4"];
const SP = ["O2", "N2", "CO2", "H2O", "CO"];
export interface HabitatInputs {
  material: string; x_o2: number; P: number; V: number; Q_peak: number; t_burn: number; t_end: number;
  growth_time?: number; T0?: number; h_w?: number | null; chi?: number | null; scrubber?: boolean; dH_O2?: number | null; y_CO?: number | null;
}
export type Series = Record<"t" | "T" | "P" | "x_o2" | "x_co2" | "x_co" | "x_h2o" | "p_o2", number[]>;

export function qOfT(t: number, i: HabitatInputs): number {
  if (t > i.t_burn) return 0;
  const tg = i.growth_time ?? 0;
  return tg > 0 ? i.Q_peak * Math.min(1, (t / tg) ** 2) : i.Q_peak;
}

export function simulate(inp: HabitatInputs, nOut = 121): Series {
  const T0 = inp.T0 ?? 298.15;
  const f = fuel(inp.material);
  const form = f.formula;
  const M_F = formulaMass(form), dHc = v(f, "dHc");
  const y_CO = inp.y_CO ?? v(f, "y_CO");
  const dH = inp.dH_O2 ?? prop("constants", "dH_O2");
  const h_w = inp.h_w ?? prop("habitat", "h_w");
  const chi = inp.chi ?? prop("habitat", "chi_r_lost");
  const A_w = prop("habitat", "wall_area_factor") * inp.V ** (2 / 3);
  const T_w = prop("habitat", "T_wall");
  const lam = inp.scrubber ? prop("habitat", "scrubber_rate") : 0;
  const n0 = (inp.P * inp.V) / (R * T0);
  const M: Record<string, number> = Object.fromEntries(SP.map((s) => [s, molarMass(s)]));
  const rhs = (t: number, y: number[]): number[] => {
    const [T, nO2, nN2, nCO2, nH2O, nCO] = y;
    const Q = nO2 > 0 ? qOfT(t, inp) : 0;
    const ns = [nO2, nN2, nCO2, nH2O, nCO];
    let cv = 0;
    for (let i = 0; i < 5; i++) cv += ns[i] * (cpMolar(SP[i], T) - R);
    const mF = Q / dHc, dCO = (y_CO * mF) / M.CO;
    return [((1 - chi) * Q - h_w * A_w * (T - T_w)) / cv, -Q / (dH * M.O2), 0,
      ((form.C ?? 0) * mF) / M_F - dCO - lam * nCO2, (((form.H ?? 0) / 2) * mF) / M_F, dCO];
  };
  const tOut = Array.from({ length: nOut }, (_, i) => (inp.t_end * i) / (nOut - 1));
  const ys = integrate(rhs, [T0, n0 * inp.x_o2, n0 * (1 - inp.x_o2), 0, 0, 0], tOut, Math.max(inp.t_end / 400, 0.5));
  const out: Series = { t: tOut, T: [], P: [], x_o2: [], x_co2: [], x_co: [], x_h2o: [], p_o2: [] };
  for (const y of ys) {
    const [T, nO2, nN2, nCO2, nH2O, nCO] = y;
    const nt = nO2 + nN2 + nCO2 + nH2O + nCO;
    out.T.push(T); out.P.push((nt * R * T) / inp.V); out.x_o2.push(nO2 / nt); out.x_co2.push(nCO2 / nt);
    out.x_co.push(nCO / nt); out.x_h2o.push(nH2O / nt); out.p_o2.push((nO2 * R * T) / inp.V);
  }
  return out;
}

// Dormand-Prince 5(4) with step control; hits output times exactly.
function integrate(f: (t: number, y: number[]) => number[], y0: number[], tOut: number[], maxStep: number): number[][] {
  const c = [0, 1 / 5, 3 / 10, 4 / 5, 8 / 9, 1, 1];
  const a = [[], [1 / 5], [3 / 40, 9 / 40], [44 / 45, -56 / 15, 32 / 9], [19372 / 6561, -25360 / 2187, 64448 / 6561, -212 / 729],
    [9017 / 3168, -355 / 33, 46732 / 5247, 49 / 176, -5103 / 18656], [35 / 384, 0, 500 / 1113, 125 / 192, -2187 / 6784, 11 / 84]];
  const b5 = [35 / 384, 0, 500 / 1113, 125 / 192, -2187 / 6784, 11 / 84, 0];
  const b4 = [5179 / 57600, 0, 7571 / 16695, 393 / 640, -92097 / 339200, 187 / 2100, 1 / 40];
  const rtol = 1e-9, atol = 1e-12;
  const res: number[][] = [y0.slice()];
  let t = tOut[0], y = y0.slice(), h = Math.min(maxStep, 1e-2);
  for (let k = 1; k < tOut.length; k++) {
    const tTarget = tOut[k];
    while (t < tTarget - 1e-12) {
      h = Math.min(h, maxStep, tTarget - t);
      const ks: number[][] = [];
      for (let s = 0; s < 7; s++) {
        const yi = y.map((yv, j) => yv + h * a[s].reduce((acc, aij, m) => acc + aij * ks[m][j], 0));
        ks.push(f(t + c[s] * h, yi));
      }
      const y5 = y.map((yv, j) => yv + h * b5.reduce((acc, bj, m) => acc + bj * ks[m][j], 0));
      const y4 = y.map((yv, j) => yv + h * b4.reduce((acc, bj, m) => acc + bj * ks[m][j], 0));
      let err = 0;
      for (let j = 0; j < y.length; j++) {
        const sc = atol + rtol * Math.max(Math.abs(y[j]), Math.abs(y5[j]));
        err = Math.max(err, Math.abs(y5[j] - y4[j]) / sc);
      }
      if (err <= 1) { t += h; y = y5; }
      h *= Math.min(5, Math.max(0.2, 0.9 * (err === 0 ? 5 : err ** -0.2)));
    }
    res.push(y.slice());
  }
  return res;
}

export function timeToLimits(r: Series, duration = "1h"): Record<string, number | null> {
  const out: Record<string, number | null> = {};
  for (const [sp, key] of [["CO", "x_co"], ["CO2", "x_co2"]] as const) {
    const thr = LIMITS[sp].ppm[duration] * 1e-6;
    const i = r[key].findIndex((val) => val >= thr);
    out[sp] = i >= 0 ? r.t[i] : null;
  }
  const thr = LIMITS.O2_min.p_o2_kPa * 1e3;
  const i = r.p_o2.findIndex((val) => val <= thr);
  out.O2 = i >= 0 ? r.t[i] : null;
  return out;
}
