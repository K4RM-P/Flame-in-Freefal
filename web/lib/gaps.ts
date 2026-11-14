// Evidence gaps: coverage of verified PSI data, conflicting evidence, coverage-based next-experiment proposals.
import coverage from "@/data/coverage.json";
import type { MissionLike } from "./ranking";

/* eslint-disable @typescript-eslint/no-explicit-any */
export const COVERAGE = (coverage as any).cells as { g: number; o2_lo: number; o2_hi: number; p_lo: number; p_hi: number; n: number }[];

export const CONFLICTS = [
  { id: "he-vs-co2", title: "Helium vs CO₂ as a microgravity suppressant",
    a: { claim: "FLEX droplets: CO₂ dispersed into air raised the heptane LOI to ≈0.17, He only to ≈0.15 (methanol ≈0.14 for both).", source: "dietrich-2014" },
    b: { claim: "A drop-tower suppressant study (external) found helium most effective (outside PSI; reference to verify).", source: "drop-tower-suppressant" },
    why: "FLEX He LOIs are also higher than pure thermal theory predicts (EmberAtlas V4b fails). Configuration-dependent: thermal theory ranks He weakest per mole (lowest cₚ), but He's high diffusivity (non-unity Lewis number) changes flame structure. Not resolved by PSI data alone.",
    test: "Same rig, same fuel, matched T_ad: He vs CO₂ vs N₂ at 0.7 and 1 atm (SoFIE or ACME/CIR)." },
  { id: "loi-ug-vs-1g", title: "Is microgravity more or less flammable than 1 g?",
    a: { claim: "BASS-II: PMMA rods burned at lower O₂ in µg (≈17%) than in 1 g (≈18%) — value to verify from figures.", source: "bass2-sci-rep-2017" },
    b: { claim: "Quiescent µg flames are weaker (no buoyant O₂ supply): BRE flames died at 21% O₂ in still air.", source: "dehghani-bre" },
    why: "Depends on flow: a small forced flow (≈ lunar buoyant velocity scale) can make µg/partial-g flames more robust than 1 g; quiescent µg is less robust.",
    test: "Map limiting O₂ vs imposed flow 0–20 cm/s at 34%/56.5 kPa for SIBAL and PMMA." },
  { id: "partial-g", title: "No partial-gravity data in PSI",
    a: { claim: "EmberAtlas bounds Moon/Mars behaviour with an equivalent buoyant flow (u_b ∝ g^{1/3}).", source: "olson-1991" },
    b: { claim: "LUCI and FM2 (outside PSI) report partial-g flammability trends, including lower limits near lunar g.", source: "ntrs-20240015307" },
    why: "Equivalent-flow mapping ignores flame shape and radiation changes; external results are not PSI data.",
    test: "Use FM2/LUCI-type data to test the u_b mapping directly; add to the calibration set when public." },
];

export interface Proposal { rank: number; x_o2: number; P_kPa: number; flow_cm_s: number; g: number; material: string; reason: string; rig: string }

/** Coverage-based proposals near the mission (fallback for GP active learning, which needs boundary data). */
export function proposeExperiments(m: MissionLike & { gravity_g?: number }, n = 5): Proposal[] {
  const cand: (Proposal & { score: number })[] = [];
  for (const x of [m.x_o2 - 0.04, m.x_o2 - 0.02, m.x_o2, m.x_o2 + 0.02]) {
    for (const P of [m.P_kPa, 70.3, 101.3]) {
      for (const u of [0.5, 2, 5, 10, 20]) {
        if (x <= 0.1 || x > 0.5) continue;
        const cell = COVERAGE.find((c) => c.g === 0 && x >= c.o2_lo && x < c.o2_hi && P >= c.p_lo && P < c.p_hi);
        const nData = cell?.n ?? 0;
        const near = Math.exp(-(((x - m.x_o2) / 0.03) ** 2) - (((P - m.P_kPa) / 25) ** 2));
        const flowGap = u <= 10 ? 1 : 0.5; // low flows bracket lunar/Mars buoyant velocity scale; least covered for solids
        cand.push({ rank: 0, x_o2: Number(x.toFixed(3)), P_kPa: P, flow_cm_s: u, g: 0, material: u <= 5 ? "SIBAL" : "PMMA",
          reason: `${nData} verified PSI points in this O₂×P cell (none for solids); ${(near * 100).toFixed(0)}% proximity to mission; flow ${u} cm/s spans the equivalent buoyant flow`,
          rig: P < 80 ? "SoFIE (CIR) — reduced-pressure capable (rig limits TODO_VERIFY)" : "SoFIE or ACME/CIR",
          score: near * flowGap / (1 + nData) });
      }
    }
  }
  return cand.sort((a, b) => b.score - a.score).slice(0, n).map((c, i) => { const { score: _s, ...rest } = c; void _s; return { ...rest, rank: i + 1 }; });
}
