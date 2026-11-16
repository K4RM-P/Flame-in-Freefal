// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// What EmberAtlas uses each NASA PSI accession for (shown on /evidence and /credits). Text only, no values:
// the numbers live in web/data and carry their own file + row provenance.
export const PSI_USES: Record<string, string> = {
  "PSI-10": "Gas-flame (ACME Flame Design) conditions: indexed for the experiment match; not used by the cabin fire engine.",
  "PSI-20": "ACME BRE: the only flight data at exploration atmospheres (gas burner emulating solids); evidence tier for O₂ ≥ 26 %.",
  "PSI-22": "ACME E-FIELD gas flames: indexed for the experiment match; not used by the cabin fire engine.",
  "PSI-23": "ACME s-Flame gas flames: indexed for the experiment match; not used by the cabin fire engine.",
  "PSI-25": "BASS-II solids: tested O₂ / pressure / flow envelope (EXTRAPOLATED check), evidence ranking, flow calibration from the file's own 'U = 1.0066(AIR)'.",
  "PSI-26": "BASS solids: tested envelope and evidence ranking.",
  "PSI-39": "CFI cool flames: indexed for the experiment match; not used by the cabin fire engine.",
  "PSI-47": "DAFT dust/aerosol: smoke evidence tier (the smoke model stays theory-only).",
  "PSI-68": "FLEX-2 droplets: indexed for the experiment match (liquid-fuel evidence).",
  "PSI-69": "FLEX droplets: PSI table cross-checked against NASA/TP-2015-216046; the droplet burning-rate model is fit and held-out tested on the TP's Table IX.",
  "PSI-98": "SAFFIRE-I: SIBAL sample used in the ISS vs Moon base preset; opposed-flow spread calibration sample (I-2).",
  "PSI-99": "SAFFIRE-II: Earth test vs orbit comparison (like-for-like samples, small n).",
  "PSI-100": "SAFFIRE-III: held-out spread test sample (III-2) and the cabin telemetry overlaid in the Saffire-III replay.",
  "PSI-101": "SAME-R smoke: smoke evidence tier and particle-size context (smoke model theory-only).",
  "PSI-102": "SAME smoke: smoke evidence tier (smoke model theory-only).",
  "PSI-107": "SPICE soot/smoke point: indexed for the experiment match; not used by the cabin fire engine.",
  "PSI-142": "FLEX cool-flame (counterflow) data summary: indexed for the experiment match.",
  "PSI-159": "CFI-G cool flames: indexed for the experiment match; not used by the cabin fire engine.",
};
