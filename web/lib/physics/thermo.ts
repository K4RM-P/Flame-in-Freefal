// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Port of emberphys/thermo.py (TH1-TH6).
import { THERMO, PROPS, prop, type Atm, type Formula } from "./data";

export const R = prop("constants", "R_univ");
export const SPECIES = ["O2", "N2", "CO2", "H2O", "CO", "AR", "HE"] as const;

function coef(sp: string, T: number): number[] {
  const c = THERMO.nasa7[sp];
  return T >= c.T_mid ? c.high : c.low;
}
export function cpMolar(sp: string, T: number): number {
  const a = coef(sp, T);
  return R * (a[0] + a[1] * T + a[2] * T ** 2 + a[3] * T ** 3 + a[4] * T ** 4);
}
export function hMolar(sp: string, T: number): number {
  const a = coef(sp, T);
  return R * T * (a[0] + (a[1] * T) / 2 + (a[2] * T ** 2) / 3 + (a[3] * T ** 3) / 4 + (a[4] * T ** 4) / 5 + a[5] / T);
}
export const dhSensible = (sp: string, T1: number, T2: number) => hMolar(sp, T2) - hMolar(sp, T1);
export const molarMass = (sp: string) => THERMO.M[sp];

export function formulaMass(f: Formula): number {
  const aw = PROPS.atomic_weights;
  // sum in sorted element order, as Python does
  return Object.keys(f).sort().reduce((s, el) => s + aw[el] * f[el], 0) * 1e-3;
}
export const o2PerFuelMol = (f: Formula) => (f.C ?? 0) + (f.H ?? 0) / 4 - (f.O ?? 0) / 2;
export const stoichS = (f: Formula) => (o2PerFuelMol(f) * molarMass("O2")) / formulaMass(f);

export const mixM = (x: Atm) => Object.entries(x).reduce((s, [k, xi]) => s + xi * molarMass(k), 0);
export function moleToMass(x: Atm): Atm {
  const M = mixM(x);
  return Object.fromEntries(Object.entries(x).map(([k, xi]) => [k, (xi * molarMass(k)) / M]));
}
export function cpMassMix(x: Atm, T: number): number {
  return Object.entries(x).reduce((s, [k, xi]) => s + xi * cpMolar(k, T), 0) / mixM(x);
}
export const density = (x: Atm, T: number, P: number) => (P * mixM(x)) / (R * T);

export function muAir(T: number): number {
  const c = PROPS.transport.air_sutherland_mu;
  return c.mu0 * (T / c.T0) ** 1.5 * ((c.T0 + c.S) / (T + c.S));
}
export function kSpecies(sp: string, T: number): number {
  const c = PROPS.transport.k_species[sp];
  return c.k300 * (T / 300) ** c.n;
}
export function kMix(x: Atm, T: number): number {
  let lin = 0, rec = 0;
  for (const [k, xi] of Object.entries(x)) {
    if (xi <= 0) continue;
    const ks = kSpecies(k, T);
    lin += xi * ks; rec += xi / ks;
  }
  return 0.5 * (lin + 1 / rec);
}
export const alpha = (x: Atm, T: number, P: number) => kMix(x, T) / (density(x, T, P) * cpMassMix(x, T));

export function atmosphere(xO2: number, diluent = "N2", xDil = 0, baseInert = "N2"): Atm {
  const x: Atm = { O2: xO2, [baseInert]: 1 - xO2 - xDil };
  if (xDil > 0) x[diluent] = (x[diluent] ?? 0) + xDil;
  return x;
}
export function diluteInto(base: Atm, agent: string, xa: number): Atm {
  const out: Atm = Object.fromEntries(Object.entries(base).map(([k, val]) => [k, val * (1 - xa)]));
  out[agent] = (out[agent] ?? 0) + xa;
  return out;
}
