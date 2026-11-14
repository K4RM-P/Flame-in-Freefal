// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// buildReview: pure function from (material, mission, data) to the Fire Safety Evidence Brief. The UI only renders this.
import type { EarthVsOrbitRow, Investigation, Material, ReviewData, TestPoint } from "@/lib/contracts";
import { RULES } from "./rules";

export interface ReviewMission { id: string; name: string; x_o2: number; P_kPa: number; gravity_g: number; flow_cm_s: number }

export type VerdictKind = "pending" | "likely" | "marginal" | "acceptable" | "no_burn_data";
export const VERDICT_LABEL: Record<VerdictKind, string> = {
  pending: "Data pending",
  likely: "Likely to sustain fire",
  marginal: "Marginal — evidence thin, test needed",
  acceptable: "Acceptable margin in tested conditions",
  no_burn_data: "No orbit burn data",
};

/** A receipt backs every number the UI shows: the rows, rule and sources that produced it. */
export interface Receipt { id: string; title: string; value: string; rule: string; rows: TestPoint[]; sources: string[]; note?: string }
export interface Answer { state: "ok" | "pending" | "nodata" | "theory"; big: string; range?: string; line: string; chips: string[]; receipt: string | null }
export interface EvidenceItem { accession: string; key: string; title: string; why: string; url: string | null; doi: string | null }

export interface Review {
  material: Material | null; mission: ReviewMission;
  verdict: { kind: VerdictKind; label: string; sentence: string; reasons: string[]; partialGravity: boolean };
  q1: Answer; q2: Answer; q3: Answer;
  earthVsOrbit: { state: "ok" | "pending" | "none"; rows: EarthVsOrbitRow[]; caveat: string };
  actions: { kind: "prevention" | "detection" | "suppression"; text: string; chips: string[] }[];
  nextTest: { state: "ok" | "pending"; condition: string; why: string; rig: string } ;
  evidence: EvidenceItem[];
  orbitPoints: TestPoint[];
  receipts: Record<string, Receipt>;
}

const pct = (x: number) => `${+(x * 100).toPrecision(3)}%`;
const kpa = (x: number) => `${+x.toPrecision(3)} kPa`;
const NON_BURN = new Set(["extinct", "insignificant", "no_ignition"]);
const inRange = (v: number, r: [number, number] | null) => !!r && v >= r[0] && v <= r[1];

export function accessionOf(key: string, inv: Record<string, Investigation>): string {
  return inv[key]?.accession ?? key;
}

export function buildReview(material_key: string, mission: ReviewMission, data: ReviewData, opts: { fallbackName?: string } = {}): Review {
  const receipts: Record<string, Receipt> = {};
  const material = data.materials?.find((m) => m.material_key === material_key) ?? null;
  const partialGravity = mission.gravity_g > 0 && mission.gravity_g < 1;
  const atm = `${pct(mission.x_o2)} O₂ · ${kpa(mission.x_o2 * mission.P_kPa)} p_O₂ · ${kpa(mission.P_kPa)}`;
  const orbit = data.testPoints.filter((t) => t.verified && t.material_key === material_key && t.gravity_g === 0);
  const acc = (k: string) => accessionOf(k, data.investigations);
  const chipsOf = (rows: TestPoint[]) => [...new Set(rows.map((r) => r.source_id || acc(r.investigation_id)))];

  const pending = !data.materials || !material;
  const base = { material, mission, orbitPoints: orbit, receipts };
  if (pending) {
    const p: Answer = { state: "pending", big: "Data pending", line: data.materials ? "This material is not in the verified PSI materials list." : "Verified PSI solid-material data has not landed yet.", chips: [], receipt: null };
    return {
      ...base,
      verdict: { kind: "pending", label: VERDICT_LABEL.pending, sentence: `${material?.display_name ?? opts.fallbackName ?? material_key} at ${atm}: no verdict until verified ISS test data is available.`, reasons: [p.line], partialGravity },
      q1: p, q2: p, q3: p,
      earthVsOrbit: { state: "pending", rows: [], caveat: RULES.earthCaveat },
      actions: [], nextTest: { state: "pending", condition: "—", why: "Coverage gaps are computed once verified data lands.", rig: "—" },
      evidence: [],
    };
  }

  // ---- Q1 verdict (conservative rules; documented on Methods) ----
  const burned = orbit.filter((t) => t.outcome === "burn" && t.x_o2 <= mission.x_o2 + 1e-9);
  const atOrAbove = orbit.filter((t) => t.x_o2 >= mission.x_o2 - 1e-9 && (t.flow_cm_s ?? 0) >= RULES.flowRange_cm_s[0] && (t.flow_cm_s ?? 0) <= RULES.flowRange_cm_s[1]);
  const inside = inRange(mission.x_o2, material.o2_range_tested ?? null) && inRange(mission.P_kPa, material.p_range_kpa ?? null) && inRange(mission.flow_cm_s, material.flow_range_cm_s ?? null);
  const reasons: string[] = [];
  let kind: VerdictKind;
  if (!material.has_burn_data || orbit.length === 0) {
    kind = "no_burn_data"; reasons.push("No verified orbit burn/extinction tests for this material.");
  } else if (burned.length) {
    kind = "likely"; reasons.push(`Burned in orbit at ${pct(Math.min(...burned.map((b) => b.x_o2)))} O₂, at or below the mission ${pct(mission.x_o2)}.`);
  } else if (atOrAbove.length && atOrAbove.every((t) => NON_BURN.has(t.outcome)) && inside) {
    kind = "acceptable"; reasons.push(`All ${atOrAbove.length} orbit tests at ≥ ${pct(mission.x_o2)} O₂ (flow ${RULES.flowRange_cm_s.join("–")} cm/s) were extinct or insignificant.`);
    if (partialGravity) { kind = "marginal"; reasons.push("Partial gravity is a bounded estimate (µg ↔ 1 g) and never upgrades a verdict to acceptable."); }
  } else {
    kind = "marginal";
    reasons.push(inside ? "Mixed or sparse orbit outcomes near the mission atmosphere." : "Mission is outside the tested O₂ / pressure / flow envelope (extrapolation).");
  }
  if (partialGravity && kind !== "marginal") reasons.push("Partial gravity shown as a bounded estimate (µg ↔ 1 g).");

  const q1Rows = burned.length ? burned : atOrAbove.length ? atOrAbove : orbit;
  receipts.q1 = { id: "q1", title: "Will it burn here?", value: VERDICT_LABEL[kind], rule: RULES.verdictText[kind], rows: q1Rows, sources: chipsOf(q1Rows) };
  const nBurn = orbit.filter((t) => t.outcome === "burn").length;
  const invs = [...new Set(q1Rows.map((r) => acc(r.investigation_id)))];
  const sentence = kind === "likely"
    ? `${material.display_name} at ${atm} · ${gravityWord(mission.gravity_g)}: likely to sustain fire. It burned in ${burned.length} of ${orbit.filter((t) => t.x_o2 <= mission.x_o2 + 1e-9).length} ISS tests at only ${rangeTxt(burned.map((b) => b.x_o2), pct)} O₂ (${invs.join(", ")}).`
    : kind === "no_burn_data"
      ? `${material.display_name}: no verified orbit burn data. Only detection (Q3) can be answered.`
      : `${material.display_name} at ${atm} · ${gravityWord(mission.gravity_g)}: ${VERDICT_LABEL[kind].toLowerCase()}. ${reasons[0]}`;
  const q1: Answer = kind === "no_burn_data"
    ? { state: "nodata", big: "∅ No orbit burn data", line: "No ISS burn tests for this material yet.", chips: [], receipt: null }
    : { state: "ok", big: VERDICT_LABEL[kind], range: `${nBurn} of ${orbit.length} orbit tests burned`, line: reasons[0], chips: chipsOf(q1Rows), receipt: "q1" };

  // ---- Q2 measured orbit spread rate, nearest conditions ----
  const spreads = orbit.filter((t) => t.outcome === "burn" && t.spread_rate_mm_s != null);
  let q2: Answer;
  if (kind === "no_burn_data" || !spreads.length) {
    q2 = { state: "nodata", big: "∅ No measured orbit spread rate", line: "No verified spread-rate rows for this material.", chips: [], receipt: null };
  } else {
    const d = (t: TestPoint) => Math.hypot((t.x_o2 - mission.x_o2) / 0.05, Math.log10(((t.flow_cm_s ?? 0) + 1) / (mission.flow_cm_s + 1)), Math.log10(t.pressure_kpa / mission.P_kPa));
    const near = [...spreads].sort((a, b) => d(a) - d(b)).slice(0, RULES.nearestN);
    const v = near.map((t) => t.spread_rate_mm_s as number);
    const med = [...v].sort((a, b) => a - b)[Math.floor(v.length / 2)];
    const extrap = !inside;
    receipts.q2 = { id: "q2", title: "If it burns, how bad?", value: `${sig3(med)} mm/s`, rule: `Median of the ${near.length} nearest verified orbit burn tests (distance in O₂, log-flow, log-pressure).`, rows: near, sources: chipsOf(near), note: extrap ? "Mission outside tested envelope: extrapolation." : undefined };
    q2 = { state: "ok", big: `${sig3(med)} mm/s`, range: v.length > 1 ? `(${sig3(Math.min(...v))}–${sig3(Math.max(...v))})` : undefined, line: `Measured flame spread in orbit at the nearest tested conditions${extrap ? " — extrapolated to your cabin" : ""}.`, chips: chipsOf(near), receipt: "q2" };
  }

  // ---- Q3 detection (smoke) ----
  const smoke = data.testPoints.filter((t) => t.verified && t.material_key === material_key && t.aging_s != null);
  const q3: Answer = material.has_smoke_data && smoke.length
    ? (receipts.q3 = { id: "q3", title: "Can we catch it and stop it?", value: `${smoke.length} smoke tests`, rule: "Smoke tests for this material from SAME/SAME-R; detector principle chosen from measured particle size.", rows: smoke, sources: chipsOf(smoke) },
      { state: "ok", big: `${smoke.length} smoke tests`, line: "Measured smoke from this material in orbit; see receipt for particle size at the detector.", chips: chipsOf(smoke), receipt: "q3" })
    : { state: "nodata", big: "∅ No smoke data for this material", line: "Suppression: 1 g reference only, µg not calibrated for solids (see Methods).", chips: [], receipt: null };

  // ---- Earth test vs orbit ----
  const evo = (data.earthVsOrbit ?? []).filter((r) => r.material_key === material_key && r.agreement !== "not_comparable");
  const earthVsOrbit = { state: data.earthVsOrbit ? (evo.length ? "ok" : "none") : "pending", rows: evo, caveat: RULES.earthCaveat } as Review["earthVsOrbit"];

  // ---- Evidence used (evidence_index if present, else investigations by row count) ----
  const ranked = data.evidenceIndex?.[material_key];
  const keys: { key: string; why: string }[] = ranked
    ? [...(ranked.Q1 ?? []), ...(ranked.Q2 ?? []), ...(ranked.Q3 ?? [])].map((r) => ({ key: r.investigation, why: r.why }))
    : material.investigations.map((k) => ({ key: k, why: `${orbit.filter((t) => t.investigation_id === k).length} verified orbit tests for this material.` }));
  const seen = new Set<string>();
  const evidence = keys.filter((k) => !seen.has(k.key) && seen.add(k.key)).slice(0, 5).map(({ key, why }) => {
    const i = data.investigations[key];
    return { key, accession: acc(key), title: i?.title_official ?? i?.name ?? key, why, url: i?.psi_investigation_url ?? null, doi: i?.doi ?? null };
  });

  // ---- Next test: tested condition nearest the mission that has no data ----
  const o2s = orbit.map((t) => t.x_o2);
  const gapO2 = o2s.length ? Math.max(...o2s) : null;
  const nextTest = {
    state: "ok" as const,
    condition: `${material.display_name} at ${atm}, flow ${mission.flow_cm_s} cm/s${gapO2 != null && gapO2 < mission.x_o2 ? ` (highest tested O₂ is ${pct(gapO2)})` : ""}`,
    why: inside ? "Mission sits inside the tested envelope but partial gravity is untested: a lunar-g analogue bounds the estimate." : "The mission atmosphere lies outside every verified orbit test for this material.",
    rig: RULES.rig,
  };

  const actions: Review["actions"] = [
    { kind: "prevention", text: kind === "likely" ? `Limit exposed ${material.display_name} area and keep cabin flow away from the quench-sensitive low-flow regime; prefer a material that self-extinguished in orbit.` : "Keep material use inside the tested envelope; treat untested conditions as flammable.", chips: q1.chips },
    { kind: "detection", text: q3.state === "ok" ? "Choose the detector principle from the measured particle size (see Q3 receipt); place it downstream of the cabin flow." : "No smoke data for this material: specify a detector validated on SAME/SAME-R smoke from similar materials.", chips: q3.chips },
    { kind: "suppression", text: "Size the suppressant from the 1 g reference concentration with a µg margin; solids have no µg-calibrated value yet.", chips: [] },
  ];

  return { ...base, verdict: { kind, label: VERDICT_LABEL[kind], sentence, reasons, partialGravity }, q1, q2, q3, earthVsOrbit, actions, nextTest, evidence };
}

function sig3(x: number) { return String(+x.toPrecision(x >= 100 ? 3 : 2)); }
function rangeTxt(v: number[], f: (x: number) => string) { const a = Math.min(...v), b = Math.max(...v); return a === b ? f(a) : `${f(a)}–${f(b)}`; }
function gravityWord(g: number) { return g === 0 ? "µg" : g === 1 ? "1 g" : g < 0.2 ? "lunar g" : g < 0.5 ? "Mars g" : `${g} g`; }
