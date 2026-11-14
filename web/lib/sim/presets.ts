// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Presets: every value carries a Provenance (PSI accession + file#row, a cited source, or "design input").
// Values with no source stay null so the UI asks the user for them.
import saffireRows from "@/public/psi/saffire.json";
import investigationsJ from "@/data/investigations.json";
import { PROPS } from "@/lib/physics/data";
import { CABINS_RAW, MATERIALS, TELEMETRY, atmosphereById, detectorSpec, type Atmosphere } from "./params";
import type { Item, Provenance, Scenario } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface Preset {
  id: string; label: string; description: string;
  build: () => Scenario | { a: Scenario; b: Scenario };
  provenance: Record<string, Provenance>;
  required: string[];
}
const HELD_EQUAL: Provenance = { source_id: "design input", note: "held equal to Scenario A for a like-for-like comparison" };
const DESIGN: Provenance = { source_id: "design input", note: "a design choice for the user to vary — not a measured value" };
const sibal = () => MATERIALS.find((m) => m.properties_key === "sibal") ?? MATERIALS.find((m) => /sibal/i.test(m.display_name)) ?? null;
const SAF: any[] = saffireRows as any[];
const row = (acc: string, sample: string) => SAF.find((r) => r.accession === acc && r.sample === sample);

/** SIBAL thickness: the PSI flight tables disagree (SAFFIRE-I "0.37" in a cm column; SAFFIRE-III ".33 cm"),
 *  so the item uses the property-file value and cites the conflict. */
function sibalThickness(): { v: number; p: Provenance } {
  const t = PROPS.fuels?.sibal?.thickness;
  return { v: Number(t?.value), p: { source_id: t?.source ?? "properties.json", note: "PSI-98/PSI-100 thickness cells conflict (0.37 vs .33, cm-labelled) — flagged; property value used" } };
}
function detection(type: "photoelectric" | "ionization", prov: Record<string, Provenance>) {
  const spec = detectorSpec(type);
  prov["detection.threshold"] = spec ? { source_id: spec.source, locator: spec.locator } : { source_id: "", note: "No data (no sourced detector threshold) — the run proceeds; the alarm shows No data" };
  prov["detection.distance_m"] = DESIGN;
  return { type, distance_m: 1, threshold: spec?.threshold ?? null };
}
function cabinFrom(a: Atmosphere, prov: Record<string, Provenance>, pre = "cabin") {
  prov[`${pre}.x_o2`] = a.sources.x_o2; prov[`${pre}.P_Pa`] = a.sources.P_Pa; prov[`${pre}.V_m3`] = a.sources.V_m3;
  prov[`${pre}.flow_m_s`] = a.sources.flow_m_s; prov[`${pre}.gravity_g`] = { source_id: a.sources.x_o2.source_id, note: `${a.name}` };
  prov[`${pre}.fan_off_on_alarm`] = DESIGN;
  return { x_o2: a.x_o2, P_Pa: a.P_Pa, gravity_g: a.gravity_g, V_m3: a.V_m3, flow_m_s: a.flow_m_s ?? 0, fan_off_on_alarm: true };
}
function sibalItem(prov: Record<string, Provenance>, r: any, swapLW = false): Item | null {
  const m = sibal();
  if (!m || !r) return null;
  const th = sibalThickness();
  prov["items.0.material_key"] = { source_id: r.source_id, locator: r.locator };
  prov["items.0.thickness_m"] = th.p;
  prov["items.0.length_m"] = { source_id: r.source_id, locator: r.locator };
  prov["items.0.width_m"] = { source_id: r.source_id, locator: r.locator };
  prov["items.0.t_ignite_s"] = DESIGN;
  return { id: "item-1", material_key: m.material_key, thickness_m: th.v, length_m: (swapLW ? r.width_cm : r.length_cm) / 100, width_m: (swapLW ? r.length_cm : r.width_cm) / 100, ignite: true, t_ignite_s: 0 };
}
const noAgent = { agent: "none" as const, delay_s: 0, mass_kg: 0 };

// ---------- 1. Saffire replay (PSI-100) ----------
const replayProv: Record<string, Provenance> = {};
function buildReplay(): Scenario {
  const prov = replayProv;
  const r3 = row("PSI-100", "S1");
  const r1 = row("PSI-98", "S1");
  const item = sibalItem(prov, r3);
  const tel = TELEMETRY;
  const tel0 = (k: "x_o2" | "P_Pa") => (tel?.[k]?.length ? tel[k]![0] : null);
  const o2 = tel0("x_o2") ?? r1?.x_o2 ?? NaN;
  prov["cabin.x_o2"] = tel0("x_o2") !== null ? { source_id: tel!.source_id, locator: `${tel!.locator}, first row` } : { source_id: r1?.source_id, locator: r1?.locator, note: "PSI-100 table has no O₂; SAFFIRE-I value (same vehicle, ambient) used" };
  const inv = (investigationsJ as any)["Saffire-I-III"];
  const P = tel0("P_Pa") ?? (inv?.p_range_kpa ? inv.p_range_kpa[0] * 1e3 : NaN);
  prov["cabin.P_Pa"] = tel0("P_Pa") !== null ? { source_id: tel!.source_id, locator: `${tel!.locator}, first row` } : { source_id: (inv?.sources ?? []).join(", "), locator: "investigations.json Saffire-I-III p_range_kpa", note: inv?.status };
  prov["cabin.flow_m_s"] = { source_id: r3?.source_id, locator: r3?.locator };
  prov["cabin.gravity_g"] = { source_id: "PSI-100", note: "Cygnus in orbit (microgravity)" };
  const cyg = CABINS_RAW?.cabins?.cygnus ?? CABINS_RAW?.atmospheres?.cygnus ?? CABINS_RAW?.cabins?.saffire;
  const V = Number(cyg?.V_m3?.value ?? cyg?.V_m3);
  prov["cabin.V_m3"] = Number.isFinite(V) && V > 0 ? { source_id: cyg?.V_m3?.source ?? cyg?.source, locator: cyg?.V_m3?.locator } : { source_id: "", note: "Enter the Cygnus free volume (not stated in PSI-100)" };
  prov["cabin.fan_off_on_alarm"] = { source_id: "PSI-100", note: "Saffire flow duct ran throughout (no fan-off)" };
  prov["suppression"] = { source_id: "PSI-100", note: "no suppression in Saffire" };
  return {
    name: "Saffire-III replay", preset_id: "saffire-replay",
    cabin: { x_o2: o2, P_Pa: P, gravity_g: 0, V_m3: Number.isFinite(V) && V > 0 ? V : null, flow_m_s: (r3?.flow_cm_s ?? NaN) / 100, fan_off_on_alarm: false },
    items: item ? [item] : [],
    detection: detection("photoelectric", prov), suppression: noAgent,
    t_end_s: Math.min(600, tel?.t.length ? Math.max(...tel.t) : 600),
  };
}

// ---------- 2. Same fabric: ISS vs Lunar Habitat ----------
const pairProv: Record<string, Provenance> = {};
function buildPair(): { a: Scenario; b: Scenario } {
  const prov = pairProv;
  const r1 = row("PSI-98", "S1"); // SAFFIRE-I lists length 40.6 cm × width 94 cm
  const item = sibalItem(prov, r1);
  const iss = atmosphereById("ISS"), lunar = atmosphereById("LunarHabitat");
  const mk = (a: Atmosphere | null, name: string): Scenario => ({
    name, preset_id: "iss-vs-lunar",
    cabin: a ? cabinFrom(a, prov, name.startsWith("ISS") ? "cabin" : "b.cabin") : { x_o2: NaN, P_Pa: NaN, gravity_g: 0, V_m3: null, flow_m_s: 0, fan_off_on_alarm: true },
    items: item ? [item] : [], detection: detection("photoelectric", prov), suppression: noAgent, t_end_s: 600,
  });
  const a = mk(iss, "ISS"), b = mk(lunar, "Lunar Habitat");
  // The lunar module volume has no sourced value: hold it equal to A so the pair is a like-for-like comparison.
  if (b.cabin.V_m3 === null && a.cabin.V_m3 !== null) { b.cabin.V_m3 = a.cabin.V_m3; prov["b.cabin.V_m3"] = HELD_EQUAL; }
  return { a, b };
}

// ---------- 3. Lunar Habitat: tune the response ----------
const tuneProv: Record<string, Provenance> = {};
function buildTune(): Scenario {
  const prov = tuneProv;
  const item = sibalItem(prov, row("PSI-98", "S1"));
  const lunar = atmosphereById("LunarHabitat");
  prov["suppression.agent"] = DESIGN; prov["suppression.delay_s"] = DESIGN; prov["suppression.mass_kg"] = DESIGN;
  const cabin = lunar ? cabinFrom(lunar, prov) : { x_o2: NaN, P_Pa: NaN, gravity_g: 0, V_m3: null as number | null, flow_m_s: 0, fan_off_on_alarm: true };
  const iss = atmosphereById("ISS");
  if (cabin.V_m3 === null && iss?.V_m3) { cabin.V_m3 = iss.V_m3; prov["cabin.V_m3"] = { ...HELD_EQUAL, note: "held equal to the ISS habitable volume (Scenario A of the ISS vs Lunar preset) for a like-for-like comparison" }; }
  return {
    name: "Lunar Habitat response", preset_id: "lunar-tune",
    cabin,
    items: item ? [item] : [], detection: detection("photoelectric", prov),
    suppression: { agent: "CO2", delay_s: 30, mass_kg: 2 }, t_end_s: 600,
  };
}

const req = (s: Scenario | { a: Scenario; b: Scenario }) => {
  const list = "a" in s && "b" in s ? [s.a, s.b] : [s as Scenario];
  const out: string[] = [];
  for (const x of list) { if (x.cabin.V_m3 === null) out.push(`${x.name}: cabin.V_m3`); if (!x.items.length) out.push(`${x.name}: items (SIBAL not in the material library)`); }
  return out;
};

export const PRESETS: Preset[] = [
  { id: "saffire-replay", label: "Saffire replay (real NASA fire)", description: "SAFFIRE-III sample S1 (PSI-100): SIBAL 94 × 40.6 cm, 30 cm/s concurrent flow, in Cygnus. Overlay the real telemetry.", build: buildReplay, provenance: replayProv, get required() { return req(buildReplay()); } },
  { id: "iss-vs-lunar", label: "Same fabric: ISS vs Lunar Habitat", description: "SAFFIRE-I SIBAL sample under the ISS atmosphere (A) and the lunar exploration atmosphere (B, 34 % O₂ at 56.5 kPa, 0.165 g bounded).", build: buildPair, provenance: pairProv, get required() { return req(buildPair()); } },
  { id: "lunar-tune", label: "Lunar Habitat: tune the response", description: "Lunar exploration atmosphere with detector, fan-off and a CO₂ release you can tune (design inputs).", build: buildTune, provenance: tuneProv, get required() { return req(buildTune()); } },
];
// Build once at load so the provenance maps are populated for hover text before the first click.
for (const p of PRESETS) { try { p.build(); } catch { /* data not yet available */ } }
export const presetById = (id: string) => PRESETS.find((p) => p.id === id) ?? null;
