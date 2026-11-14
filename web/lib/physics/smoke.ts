// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Port of emberphys/smoke.py (SM1-SM3).
import { prop } from "./data";
import { R, mixM, muAir } from "./thermo";

export const EQ = ["SM1", "SM2", "SM3"];
export function coagCoeff(d: number, T: number, P: number): number {
  const mu = muAir(T);
  const M = mixM({ O2: 0.21, N2: 0.79 });
  const lam = (2 * mu) / (P * Math.sqrt((8 * M) / (Math.PI * R * T)));
  const Kn = (2 * lam) / d;
  const Cc = 1 + Kn * (1.257 + 0.4 * Math.exp(-1.1 / Kn));
  return ((8 * prop("constants", "k_B") * T) / (3 * mu)) * Cc;
}
export function age(t: number, N0: number, d0: number, T: number, P: number) {
  const K = coagCoeff(d0, T, P);
  const N = N0 / (1 + 0.5 * K * N0 * t);
  const d30 = d0 * Math.cbrt(N0 / N);
  const s2 = Math.log(prop("smoke", "sigma_g")) ** 2;
  const dg = d30 / Math.exp(1.5 * s2);
  return { N, d30, d10: dg * Math.exp(0.5 * s2), d43: dg * Math.exp(3.5 * s2), K_c: K };
}
export const favouredDetector = (d43: number) => (d43 * 1e9 >= prop("smoke", "photoelectric_threshold_nm") ? "photoelectric" : "ionization");
