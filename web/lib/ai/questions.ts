// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// The 12 golden questions (PRD §11). Light module for the client; lib/ai/golden.ts holds tools + composers.
export const GOLDEN_QUESTIONS = [
  "For a 34%/8.2 psia lunar habitat, which PSI investigations matter most and why?",
  "Can PMMA burn at lower O₂ in microgravity than in a 1 g test? Show the evidence and the model.",
  "Estimate the opposed-flow spread rate over 0.37 mm SIBAL fabric at 34% O₂, 8.2 psia, 10 cm/s, in lunar gravity, with uncertainty.",
  "How much CO₂ (mole fraction) would be needed to inert a heptane fire at 21%/14.7 psia vs 34%/8.2 psia? Compare 1 g and µg calibrations.",
  "What is heptane's droplet LOI, and how does CO₂ dilution change it?",
  "Do flames survive without ventilation at 34% O₂? (BRE + boundary model)",
  "A 5 kW fire burns 3 minutes in a 20 m³ rover: what happens to cabin T, P, O₂ and CO₂?",
  "What smoke particle sizes reach a detector 2 minutes from the source, and which detector type suits them?",
  "Is there lunar-gravity data in PSI? (Answer: no; explain the bounding method.)",
  "Is helium or CO₂ the better suppressant in microgravity?",
  "Where is the evidence thinnest for lunar habitats, and what 5 tests would most reduce uncertainty?",
  "Compare BASS-II and Saffire on SIBAL fabric: what changes with scale?"
] as const;

// Suggested order per onboarding role (indices into GOLDEN_QUESTIONS).
export const ROLE_QUESTIONS: Record<string, number[]> = { safety: [2, 3, 6, 8], research: [4, 1, 9, 11], experiment: [10, 8, 5, 11] };
