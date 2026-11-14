// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// A3: "what changed" between two test points. Lists only the conditions that differ; one difference = minimal pair.
import type { TestPoint } from "./testPoints";

export const CONDITION_FIELDS = [
  { k: "fuel", label: "fuel", unit: "" }, { k: "x_o2", label: "O₂ mole fraction", unit: "" }, { k: "pressure_kpa", label: "pressure", unit: "kPa" },
  { k: "diluent", label: "diluent", unit: "" }, { k: "x_diluent", label: "added diluent fraction", unit: "" }, { k: "d0_mm", label: "initial droplet diameter", unit: "mm" },
  { k: "flow_cm_s", label: "flow", unit: "cm/s" }, { k: "gravity_g", label: "gravity", unit: "g" },
] as const;
// Numbers closer than this relative tolerance count as equal (reported values carry 3–4 significant figures).
export const REL_TOL = 5e-3;

export interface Change { k: string; label: string; unit: string; a: unknown; b: unknown }
const same = (a: unknown, b: unknown) =>
  typeof a === "number" && typeof b === "number" ? Math.abs(a - b) <= REL_TOL * Math.max(Math.abs(a), Math.abs(b)) : a === b;

export function conditionDiff(a: TestPoint, b: TestPoint): { changes: Change[]; minimalPair: boolean } {
  const changes = CONDITION_FIELDS.filter((f) => !same(a[f.k as keyof TestPoint], b[f.k as keyof TestPoint]))
    .map((f) => ({ k: f.k, label: f.label, unit: f.unit, a: a[f.k as keyof TestPoint], b: b[f.k as keyof TestPoint] }));
  return { changes, minimalPair: changes.length === 1 };
}
