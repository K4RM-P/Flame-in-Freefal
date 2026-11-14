// Port of emberphys/spread.py (SP1-SP5).
import { fuel, prop, v, type Atm } from "./data";
import { flameTemperature } from "./flameTemp";
import { R, cpMassMix, density, kMix, moleToMass } from "./thermo";

export const EQ = ["SP1", "SP2", "SP3", "SP4", "SP5", "BS1", "BS2"];
export interface SpreadParams { f_T: number; mu: number | null; b: number }
export const defaultSpreadParams = (): SpreadParams => ({ f_T: 1, mu: null, b: 1 });
export type SolidProps = Partial<Record<"T_v" | "c_s" | "k_s" | "dHc" | "rho_s", number>>;

export function solidProps(material: string, thickness: number | null = null, props: SolidProps = {}) {
  const f = fuel(material);
  const pr: Record<string, number> = {};
  for (const k of ["T_v", "c_s", "k_s", "dHc", "E_a"]) if (f[k]) pr[k] = v(f, k);
  const d = thickness ?? (f.thickness ? v(f, "thickness") : 1e-2);
  if (f.areal_density && thickness === null) { pr.areal = v(f, "areal_density"); pr.rho_s = pr.areal / d; }
  else { pr.rho_s = f.rho_s ? v(f, "rho_s") : v(f, "areal_density") / d; pr.areal = pr.rho_s * d; }
  pr.d = d;
  if (Object.keys(props).length) { Object.assign(pr, props); pr.areal = pr.rho_s * pr.d; }
  return pr;
}

export function spreadRate(material: string, x: Atm, P: number, Vg: number, Tinf: number, thickness: number | null = null,
  p: SpreadParams = defaultSpreadParams(), props: SolidProps = {}) {
  const pr = solidProps(material, thickness, props);
  const Tv = pr.T_v;
  const T_f = flameTemperature(material, x, Tinf, Tv, p.f_T, pr.dHc);
  const Tfilm = 0.5 * (T_f + Tinf);
  const k_g = kMix(x, Tfilm), rho_g = density(x, Tfilm, P), c_g = cpMassMix(x, Tfilm);
  const phi = (T_f - Tv) / (Tv - Tinf);
  const Cthin = prop("spread", "C_thin"), n = prop("spread", "blend_exponent");
  const V_thin = (Cthin * k_g * phi) / (pr.areal * pr.c_s);
  const V_thick = Vg * (k_g * rho_g * c_g) / (pr.k_s * pr.rho_s * pr.c_s) * phi ** 2;
  const V_dr = fuel(material).material_class === "thin_fabric" ? V_thin : (V_thin ** n + V_thick ** n) ** (1 / n);
  const alpha_g = k_g / (rho_g * c_g);
  const y_o = moleToMass(x).O2;
  const V_r = Vg + V_dr;
  const lnDa = Math.log((alpha_g * rho_g * y_o) / V_r ** 2) - pr.E_a / (R * T_f);
  const F = p.mu === null ? 1 : 1 / (1 + Math.exp(-(lnDa - p.mu) / p.b));
  const alpha_s = pr.k_s / (pr.rho_s * pr.c_s);
  return { V_f: V_dr * F, V_thin, V_thick, V_deRis: V_dr, F, lnDa, T_f, regime_ratio: pr.d / (alpha_s / Math.max(V_dr * F, 1e-12)) };
}
export const quenchWarning = (Vg: number) => Vg * 100 < prop("spread", "low_flow_quench_cm_s");
