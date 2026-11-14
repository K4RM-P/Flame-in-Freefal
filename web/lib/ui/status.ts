import type { ModelResult } from "@/lib/physics/models";
import summary from "@/data/validation/summary.json";

export type Status = "validated" | "extrapolation" | "theory" | "nodata";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TARGETS = (summary as any).targets as { id: string; model: string; status: string; quantity: string }[];

/** Status of a result: theory-only if uncalibrated; extrapolation if calibrated but outside the data envelope. */
export function statusOf(r: ModelResult | null): { status: Status; reason: string } {
  if (!r) return { status: "nodata", reason: "No model or data for this quantity yet." };
  if (!r.validity.calibrated) return { status: "theory", reason: r.validity.note || "Uncalibrated — theory only; not yet validated against PSI data." };
  if (!r.validity.in_envelope) {
    const nn = r.validity.nearest_data_distance;
    return { status: "extrapolation", reason: `Outside calibrated range${nn != null ? ` (nearest ISS data ${nn.toFixed(1)} σ away)` : ""}.` };
  }
  const v = TARGETS.filter((t) => t.model === r.model_id);
  const pass = v.filter((t) => t.status === "pass").length;
  return { status: "validated", reason: `Inside the calibration envelope. ${pass}/${v.length} validation targets for this model pass.` };
}
export const targetsFor = (model: string) => TARGETS.filter((t) => t.model === model);
