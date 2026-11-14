// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Port of emberphys/suppression.py (SU1, SU2).
import { SUPPRESSION_PARAMS, fuel, prop, type Atm } from "./data";
import { brentq } from "./numerics";
import { dhSensible, diluteInto, molarMass, o2PerFuelMol } from "./thermo";

export const EQ = ["SU1", "SU2"];
export const DH_O2 = prop("constants", "dH_O2");

export function tAd(fuelName: string, x: Atm, Tinf: number, dH = DH_O2): number {
  const f = fuel(fuelName).formula;
  const nu = o2PerFuelMol(f);
  const nO2 = x.O2;
  const prod: Atm = {};
  for (const [k, val] of Object.entries(x)) if (k !== "O2") prod[k] = val;
  prod.CO2 = (prod.CO2 ?? 0) + (nO2 * (f.C ?? 0)) / nu;
  prod.H2O = (prod.H2O ?? 0) + (nO2 * (f.H ?? 0)) / 2 / nu;
  const q = nO2 * dH * molarMass("O2");
  const resid = (T: number) => Object.entries(prod).reduce((s, [sp, n]) => s + n * dhSensible(sp, Tinf, T), 0) - q;
  return brentq(resid, Tinf, 6000, 1e-9);
}

export function agentFraction(fuelName: string, base: Atm, agent: string, Tcrit: number, Tinf: number, dH = DH_O2): number {
  const g = (xa: number) => tAd(fuelName, diluteInto(base, agent, xa), Tinf, dH) - Tcrit;
  if (g(0) <= 0) return 0;
  return brentq(g, 0, 0.999, 1e-10);
}

export function tCrit1g(Tinf: number, mec = prop("suppression", "cup_burner_N2_MEC_heptane")): number {
  return tAd("n-heptane", diluteInto({ O2: 0.21, N2: 0.79 }, "N2", mec), Tinf);
}
export function tCritUg(fuelName: string): number | null {
  return SUPPRESSION_PARAMS?.fuels?.[fuelName]?.T_crit_ug ?? null;
}
export function loiThermal(fuelName: string, Tcrit: number, Tinf: number, agent: string | null = null, baseO2 = 0.21): number {
  if (agent === null) return brentq((z) => tAd(fuelName, { O2: z, N2: 1 - z }, Tinf) - Tcrit, 0.01, 0.99, 1e-10);
  return baseO2 * (1 - agentFraction(fuelName, { O2: baseO2, N2: 1 - baseO2 }, agent, Tcrit, Tinf));
}
