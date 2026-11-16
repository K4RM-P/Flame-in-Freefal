// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Material envelope explorer data: what NASA tested per material (O₂, pressure, flow ranges from PSI rows and the
// investigation cards), the mission atmospheres (missions.json), ACME BRE's O₂ levels (gas burner; chamber pressure not
// identified in the PSI-20 table) and, for any cabin point, which materials cover it. Ranges are drawn as tested;
// degenerate ranges (one pressure) stay degenerate. The coverage check uses the engine's own envelope tolerance.
import missionsJ from "@/data/missions.json";
import bre from "@/data/psi/bre_atmospheres.json";
import { evidenceStops } from "@/lib/sim/evidence";
import { insideRange, tolerantRange } from "@/lib/sim/params";

export interface MaterialBox {
  key: string; name: string; investigations: string[]; n_tests: number | null;
  o2: [number, number] | null; P_kPa: [number, number] | null; flow_cm_s: [number, number] | null;
}
export interface MissionPoint { id: string; name: string; x_o2: number; P_kPa: number; flow_cm_s: number; gravity_g: number; source: string }
export interface CabinPoint { label: string; x_o2: number; P_kPa: number; flow_cm_s: number | null; material?: string | null }
export interface Coverage { key: string; name: string; o2: boolean | null; P: boolean | null; flow: boolean | null; inside: boolean; gap: string }

const r = (x: [number, number] | null, f: number): [number, number] | null => (x ? [x[0] * f, x[1] * f] : null);

export function materialBoxes(): MaterialBox[] {
  return evidenceStops("LunarHabitat").rows.map((m) => ({
    key: m.material_key, name: m.display_name, investigations: m.investigations, n_tests: m.n_tests,
    o2: r(m.o2_range, 100), P_kPa: r(m.P_range_Pa, 1e-3), flow_cm_s: r(m.flow_range_m_s, 100),
  }));
}

export function missionPoints(): MissionPoint[] {
  return Object.entries(missionsJ as Record<string, { name: string; x_o2: number; P_kPa: number; gravity_g: number; flow_cm_s: number; source: string }>)
    .map(([id, m]) => ({ id, name: m.name, x_o2: m.x_o2 * 100, P_kPa: m.P_kPa, flow_cm_s: m.flow_cm_s, gravity_g: m.gravity_g, source: m.source }));
}

/** ACME BRE O₂ levels flown (PSI-20). Pressures are not identified in the table, so only O₂ is plotted. */
export function breO2(): { o2: number; days: number; locator: string }[] {
  return Object.values((bre as { by_o2: Record<string, { o2_pct: number; test_days: number; locators: string[] }> }).by_o2)
    .map((b) => ({ o2: b.o2_pct, days: b.test_days, locator: b.locators[0] ?? "PSI-20" }));
}
export const BRE_PRESSURE_NOTE = (bre as { pressure_note?: string }).pressure_note ?? "";

/** Which tested materials cover a cabin point (same tolerance as the engine's Extrapolated badge). */
export function coverage(p: CabinPoint, boxes = materialBoxes()): Coverage[] {
  return boxes.map((b) => {
    const o2 = b.o2 ? insideRange(p.x_o2 / 100, tolerantRange([b.o2[0] / 100, b.o2[1] / 100], "x_o2")) : null;
    const P = b.P_kPa ? insideRange(p.P_kPa * 1e3, tolerantRange([b.P_kPa[0] * 1e3, b.P_kPa[1] * 1e3], "P_Pa")) : null;
    const flow = b.flow_cm_s && p.flow_cm_s !== null ? insideRange(p.flow_cm_s / 100, tolerantRange([b.flow_cm_s[0] / 100, b.flow_cm_s[1] / 100], "flow_m_s")) : null;
    const gaps: string[] = [];
    if (o2 === false && b.o2) gaps.push(p.x_o2 > b.o2[1] ? `O₂ ${+(p.x_o2 - b.o2[1]).toFixed(1)} points above the highest tested (${+b.o2[1].toFixed(1)} %)` : `O₂ below the lowest tested (${+b.o2[0].toFixed(1)} %)`);
    if (P === false && b.P_kPa) gaps.push(b.P_kPa[0] === b.P_kPa[1] ? `tested only at ${+b.P_kPa[0].toFixed(1)} kPa` : `pressure outside the tested ${+b.P_kPa[0].toFixed(1)}–${+b.P_kPa[1].toFixed(1)} kPa`);
    if (flow === false && b.flow_cm_s) gaps.push(b.flow_cm_s[0] === b.flow_cm_s[1] ? `flow tested only at ${+b.flow_cm_s[0].toFixed(1)} cm/s` : `flow outside the tested ${+b.flow_cm_s[0].toFixed(1)}–${+b.flow_cm_s[1].toFixed(1)} cm/s`);
    if (o2 === null || P === null) gaps.push("no tested range on record for O₂ or pressure");
    return { key: b.key, name: b.name, o2, P, flow, inside: o2 === true && P === true && flow !== false, gap: gaps.join("; ") };
  });
}

/** Parse ?o2=&p=&u=&mat= (percent, kPa, cm/s) from the simulator's "See it on the envelope" link. */
export function pointFromQuery(q: URLSearchParams): CabinPoint | null {
  const o2 = Number(q.get("o2")), P = Number(q.get("p"));
  if (!(o2 > 0 && o2 <= 100) || !(P > 0 && P < 1000)) return null;
  const u = q.get("u") !== null ? Number(q.get("u")) : null;
  return { label: q.get("label")?.slice(0, 60) || "Your cabin", x_o2: o2, P_kPa: P, flow_cm_s: u !== null && u >= 0 ? u : null, material: q.get("mat") };
}
