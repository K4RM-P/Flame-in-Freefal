// Port of emberphys/gravity.py (GR1, GR2). Partial gravity = bounded estimate.
import { prop, type Atm } from "./data";
import { alpha } from "./thermo";

export const EQ = ["GR1", "GR2"];
export const G0 = prop("constants", "g0");
export const PRESETS = { ug: 0, moon: 0.165, mars: 0.378, earth: 1 } as const;
export function buoyantVelocity(g: number, x: Atm, P: number, Tf: number, Tinf: number): number {
  const a = alpha(x, 0.5 * (Tf + Tinf), P);
  return Math.cbrt(g * G0 * a * (Tf - Tinf) / Tinf);
}
export const equivalentFlow = (U: number, ub: number, orientation: "opposed" | "cross" = "opposed") =>
  orientation === "opposed" ? U + ub : Math.hypot(U, ub);
