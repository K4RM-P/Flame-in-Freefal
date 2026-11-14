// Verdict-rule parameters. These are product rules from docs/PRD (review spec), not physical properties.
// TODO_VERIFY: realistic cabin flow range should move to physics/data with a source (docs/HUMAN_TASKS.md).
export const RULES = {
  flowRange_cm_s: [0, 30] as [number, number],
  nearestN: 3,
  rig: "SoFIE (Solid Fuel Ignition and Extinction) in the ISS Combustion Integrated Rack; FM2 module",
  earthCaveat: "Under these conditions; not a verdict on the standard.",
  verdictText: {
    pending: "No verdict until verified data lands.",
    likely: "Likely to sustain fire: the material burned (sustained spread) in orbit at x_O₂ ≤ the mission x_O₂ for some tested flow.",
    acceptable: "Acceptable margin: every orbit test at x_O₂ ≥ the mission x_O₂ across 0–30 cm/s flow was extinct or insignificant, AND the mission is inside the tested envelope. Partial gravity never upgrades to this.",
    marginal: "Marginal: anything in between, or extrapolated beyond tested O₂, pressure or flow.",
    no_burn_data: "No orbit burn data: smoke-only or untested material. Only Q3 is answered.",
  },
} as const;
