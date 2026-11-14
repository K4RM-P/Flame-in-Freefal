// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Port of emberphys/droplet.py (DR1-DR7).
import { DROPLET_PARAMS, fuel, prop, v, type Atm } from "./data";
import { flameTemperature } from "./flameTemp";
import { brentq, maximize } from "./numerics";
import { R, cpMassMix, density, diluteInto, kMix, moleToMass, stoichS } from "./thermo";

export const EQ = ["DR1", "DR2", "DR3", "DR4", "DR5", "DR6", "DR7", "BS1", "BS2"];
const SIGMA = prop("constants", "sigma_SB");
const P_ATM = prop("constants", "P_atm");

export interface DropletParams { f_k: number; f_T: number; ln_CD: number; a_eff: number }
export function paramsFor(fuelName: string): DropletParams {
  const p = DROPLET_PARAMS?.fuels?.[fuelName]?.params;
  return p ? { ...p } : { f_k: 1, f_T: 1, ln_CD: 25, a_eff: prop("droplet", "a_eff_prior") };
}
export interface DropletState { K: number; B: number; standoff: number; T_f0: number; T_bar: number; k_g: number; cp_g: number; rho_g: number; alpha_g: number; y_o: number }
export type Props = Partial<Record<"dHc" | "T_boil" | "h_fg" | "rho_l", number>>;

export function state(fuelName: string, x: Atm, P: number, Tinf: number, p: DropletParams, props: Props = {}): DropletState {
  const f = fuel(fuelName);
  const pr = { dHc: v(f, "dHc"), T_boil: v(f, "T_boil"), h_fg: v(f, "h_fg"), rho_l: v(f, "rho_l"), ...props };
  const s = stoichS(f.formula);
  const y_o = moleToMass(x).O2;
  const T_f0 = flameTemperature(fuelName, x, Tinf, pr.T_boil, p.f_T, pr.dHc);
  const T_bar = 0.5 * (pr.T_boil + T_f0);
  const k_g = p.f_k * kMix(x, T_bar);
  const cp_g = cpMassMix(x, T_bar);
  const rho_g = density(x, T_bar, P);
  const alpha_g = kMix(x, T_bar) / (rho_g * cp_g);
  const B = (pr.dHc * y_o / s + cp_g * (Tinf - pr.T_boil)) / pr.h_fg;
  const K = (8 * k_g) / (pr.rho_l * cp_g) * Math.log1p(B);
  const standoff = Math.log1p(B) / Math.log1p(y_o / s);
  return { K, B, standoff, T_f0, T_bar, k_g, cp_g, rho_g, alpha_g, y_o };
}

export function lnDa(d: number, st: DropletState, fuelName: string, P: number, Tinf: number, p: DropletParams, props: Props = {}): number {
  const f = fuel(fuelName);
  const rho_l = props.rho_l ?? v(f, "rho_l");
  const dHc = props.dHc ?? v(f, "dHc");
  const E = v(f, "E_a");
  const r_s = 0.5 * d, r_f = st.standoff * r_s;
  const chi = (32 / 3) * p.a_eff * (P / P_ATM) * SIGMA * (st.T_f0 ** 4 - Tinf ** 4) * r_f ** 3 / (rho_l * r_s * st.K * dHc);
  const T_f = Math.max(st.T_f0 - chi * (st.T_f0 - Tinf), Tinf + 1);
  return p.ln_CD + Math.log((r_f ** 2 * st.rho_g * st.y_o) / st.alpha_g) - E / (R * T_f);
}

/** [d_diffusive, d_radiative, max lnDa] in m; nulls if no burning. */
export function extinctionDiameters(fuelName: string, x: Atm, P: number, Tinf: number, p?: DropletParams, props: Props = {}): [number | null, number | null, number] {
  const pp = p ?? paramsFor(fuelName);
  const st = state(fuelName, x, P, Tinf, pp, props);
  const g = (z: number) => lnDa(Math.exp(z), st, fuelName, P, Tinf, pp, props);
  const lo = Math.log(1e-6), hi = Math.log(0.5);
  const { x: zmax, fx: gmax } = maximize(g, lo, hi);
  if (gmax < 0) return [null, null, gmax];
  const dd = g(lo) < 0 ? Math.exp(brentq(g, lo, zmax)) : null;
  const dr = g(hi) < 0 ? Math.exp(brentq(g, zmax, hi)) : null;
  return [dd, dr, gmax];
}

export function loi(fuelName: string, P: number, Tinf: number, agent: string | null = null, p?: DropletParams, baseO2 = 0.21): number {
  const pp = p ?? paramsFor(fuelName);
  const atm = (z: number): Atm => (agent === null ? { O2: z, N2: 1 - z } : diluteInto({ O2: baseO2, N2: 1 - baseO2 }, agent, 1 - z / baseO2));
  const gm = (z: number) => extinctionDiameters(fuelName, atm(z), P, Tinf, pp)[2];
  const hi = agent === null ? 0.999 : baseO2, lo = 0.02;
  if (gm(hi) < 0) return NaN;
  if (gm(lo) > 0) return lo;
  return brentq(gm, lo, hi, 1e-7);
}
