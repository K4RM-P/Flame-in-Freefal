// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Single source for science caveats shown in engine warnings, Methods, AI instructions and docs.
export const PARTIAL_G_CAVEAT =
  "Partial gravity (1/6 g) is estimated between µg and 1 g. NASA's FM2 lunar-gravity tests show some materials burn more readily at lunar g than at either, so this estimate may be non-conservative.";
/** Same caveat with the scenario's gravity named (the FM2 finding is for lunar g). */
export const partialGCaveat = (g: number) =>
  Math.abs(g - 1 / 6) < 0.01 ? PARTIAL_G_CAVEAT : PARTIAL_G_CAVEAT.replace("Partial gravity (1/6 g)", `Partial gravity (${g} g)`);
export const PARTIAL_G_SOURCE = "ntrs-20240015307";
/** Prefix for any number from an uncalibrated sub-model (CO, smoke, cabin heat loss). */
export const THEORY_ONLY = "theory-only";
/** Outcome metrics whose value depends on an uncalibrated sub-model regardless of the spread calibration. */
export const THEORY_ONLY_METRICS = new Set(["peak_co", "peak_T"]);
