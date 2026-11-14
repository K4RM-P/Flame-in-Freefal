// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Plain-language definitions, ≤ 20 words each.
export const GLOSSARY: Record<string, string> = {
  LOI: "Limiting oxygen index: the lowest oxygen fraction at which a flame can keep burning.",
  "opposed flow": "Air moving against the direction the flame spreads; the usual case for fires spreading into fresh fabric.",
  "concurrent flow": "Air moving the same way the flame spreads; flames grow faster and longer.",
  "Damköhler number": "Ratio of the time air spends near the flame to the time chemistry needs; low means the flame can go out.",
  "thermally thin": "A material heated through its whole thickness at once, like fabric or paper.",
  "burning-rate constant": "K in the d²-law: how fast a burning droplet's diameter-squared shrinks, in mm²/s.",
  "parity plot": "Predicted versus measured values; points on the diagonal mean the model is right.",
  "p05–p95": "The range containing 90 % of Monte Carlo outcomes given uncertain inputs and fitted parameters.",
  "exploration atmosphere": "NASA's proposed habitat air: 34 % oxygen at 8.2 psia (56.5 kPa), to ease spacesuit prebreathing.",
  SIBAL: "Cotton–fiberglass (75/25) cabin fabric used as a standard fuel in NASA spacecraft fire tests.",
  PMMA: "Polymethyl methacrylate (acrylic), a clear plastic used for windows and as a reference solid fuel.",
  "buoyant-equivalent flow": "The air speed that buoyancy at a given gravity is worth, added to fan flow; a bounded estimate.",
  "bounded estimate": "A range between microgravity and gravity-equivalent results, not a measurement; PSI has no partial-gravity tests.",
};
