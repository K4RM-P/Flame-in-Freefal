// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Rule-based scenario builder (works with no API key) + the gap filler shared with the OpenAI path.
// Every filled value carries a provenance tag: "nasa" (cited atmosphere / PSI sample row), "user" (the text or an
// interview answer) or "assumption" (amber, must be confirmed). Materials only ever come from materials.json.
import { z } from "zod";
import { MATERIALS, atmosphereById, type Material } from "@/lib/sim/params";
import { CREW_RESPONSE, presetById } from "@/lib/sim/presets";
import { ScenarioSchema, type Item, type Scenario } from "@/lib/sim/types";

export type FieldSource = "nasa" | "user" | "assumption";
export interface FieldTag { source: FieldSource; note: string }
export type Where = "ISS" | "MoonBase" | "LunarHabitat" | "Mars" | "Cygnus";
export interface Answers {
  where?: Where | null;
  material?: string | null;           // material_key
  ignition?: "wire" | "short" | "hot_surface" | "item" | "none" | null;
  detector?: "yes" | "no" | "unsure" | null;
  extinguisher?: "yes" | "no" | "unsure" | null;
  fan_off?: "yes" | "no" | "unsure" | null;
  o2_percent?: number | null; pressure_kPa?: number | null;
}
export interface Rejected { requested: string; reason: string; closest: string | null }
export interface BuiltDraft {
  scenario: Scenario | null;            // full, ScenarioSchema-valid, or null if nothing could be built
  fields: Record<string, FieldTag>;
  answers: Answers;                     // what the text (or the interview) has settled
  missing: (keyof Answers)[];           // what the interview should still ask
  rejected: Rejected[];
  notes: string[];
  offline: boolean;
}

/** Plain words → material_key. Only keys present in materials.json survive (never invents a material). */
const SYNONYM_SEED: [RegExp, string][] = [
  [/\bnomex\b/i, "nomex"],
  [/\b(sibal|cotton|fabric|cloth|textile|fibre ?glass|fiberglass)\b/i, "sibal"],
  [/\b(pmma|acrylic|plexiglass?|perspex|plastic)\b/i, "pmma"],
  [/\b(silicone|rubber|gasket)\b/i, "silicone"],
  [/\b(kapton|polyimide|cable|cables|wire|wires|wiring|harness|insulation)\b/i, "kapton"],
  [/\b(teflon|ptfe)\b/i, "teflon"],
  [/\b(lamp ?wick|wick)\b/i, "lamp_wick"],
  [/\b(pyrell|foam)\b/i, "pyrell"],
];
/** Words for things that burn but have no PSI data: rejected, with the closest tested material suggested. */
const UNKNOWN_SEED: [RegExp, string, string][] = [
  [/\b(paper|cardboard|cellulose|tissue|wipes?)\b/i, "sibal", "cellulosic sheet; SIBAL (cotton–fibreglass fabric) is the nearest NASA-tested thin fuel"],
  [/\b(wood|clothing|clothes)\b/i, "sibal", "SIBAL fabric is the nearest NASA-tested fuel"],
  [/\b(polyethylene|nylon|polycarbonate|abs)\b/i, "pmma", "PMMA is the nearest NASA-tested polymer"],
];
const keys = () => new Set(MATERIALS.map((m) => m.material_key));
export const SYNONYMS: [RegExp, string][] = (() => {
  const k = keys();
  const fromNames = MATERIALS.map((m): [RegExp, string] => [new RegExp(`\\b${m.display_name.split(/[ &]/)[0].replace(/[^\w]/g, "")}\\b`, "i"), m.material_key]);
  return [...SYNONYM_SEED, ...fromNames].filter(([, key]) => k.has(key));
})();

export function matchMaterial(word: string): string | null {
  for (const [re, key] of SYNONYMS) if (re.test(word)) return key;
  return null;
}
export const materialOf = (key: string | null | undefined): Material | undefined => (key ? MATERIALS.find((m) => m.material_key === key) : undefined);

function findMaterials(text: string): { keys: string[]; rejected: Rejected[] } {
  const hits: { i: number; key: string }[] = [];
  for (const [re, key] of SYNONYMS) { const m = re.exec(text); if (m) hits.push({ i: m.index, key }); }
  hits.sort((a, b) => a.i - b.i);
  const out = [...new Set(hits.map((h) => h.key))];
  const k = keys();
  const rejected: Rejected[] = [];
  for (const [re, closest, why] of UNKNOWN_SEED) {
    const m = re.exec(text);
    if (m && !out.length) rejected.push({ requested: m[0], reason: `“${m[0]}” is not in NASA's PSI material data (${why}).`, closest: k.has(closest) ? closest : null });
  }
  return { keys: out, rejected };
}

const num = (re: RegExp, t: string) => { const m = re.exec(t); return m ? Number(m[1]) : null; };

/** Keyword parse of the free text into interview answers. */
export function parseText(text: string): { answers: Answers; materials: string[]; rejected: Rejected[]; empty: boolean } {
  const t = text.toLowerCase();
  const a: Answers = {};
  if (/\b(cygnus|cargo)\b/.test(t)) a.where = "Cygnus";
  else if (/\b(iss|space station|station module)\b/.test(t)) a.where = "ISS";
  else if (/\bmars\b/.test(t)) a.where = "Mars";
  else if (/\b(lunar habitat|exploration atmosphere)\b/.test(t)) a.where = "LunarHabitat";
  else if (/\b(moon|lunar)\b/.test(t)) a.where = "MoonBase";
  a.o2_percent = num(/(\d+(?:\.\d+)?)\s*%\s*(?:o2|o₂|oxygen)?/, t);
  a.pressure_kPa = num(/(\d+(?:\.\d+)?)\s*kpa/, t);
  const empty = /\b(empty|nothing inside|no materials?)\b/.test(t);
  const { keys: materials, rejected } = empty ? { keys: [], rejected: [] } : findMaterials(t);
  if (materials.length) a.material = materials[0];
  if (/\b(short|arc)\b/.test(t)) a.ignition = "short";
  else if (/\b(overheat|hot wire|wire)\b/.test(t)) a.ignition = "wire";
  else if (/\bhot surface|heater\b/.test(t)) a.ignition = "hot_surface";
  else if (/\b(fire|burn|burning|ignit\w*|catch\w*|flame|spark)\b/.test(t)) a.ignition = "item";
  if (/\bno (detector|alarm)\b/.test(t)) a.detector = "no"; else if (/\b(detector|alarm)\b/.test(t)) a.detector = "yes";
  if (/\bno (extinguisher|suppression)\b/.test(t)) a.extinguisher = "no"; else if (/\b(extinguisher|co2|co₂|suppression)\b/.test(t)) a.extinguisher = "yes";
  return { answers: a, materials, rejected, empty };
}

const ORDER: (keyof Answers)[] = ["where", "material", "ignition", "detector"];
export const MAX_QUESTIONS = 4;

/** Cabin atmosphere for a "where" answer, with its cited provenance. */
function cabinFor(where: Where, fields: Record<string, FieldTag>): Scenario["cabin"] | null {
  if (where === "Cygnus") {
    const rep = presetById("saffire-replay")?.build() as Scenario | undefined;
    if (!rep) return null;
    for (const k of ["x_o2", "P_Pa", "gravity_g", "V_m3", "flow_m_s"]) fields[`cabin.${k}`] = { source: "nasa", note: "Cygnus cabin in the Saffire-III replay (PSI-100 / cited cabins file)" };
    const iss = atmosphereById("ISS");
    if (rep.cabin.V_m3 === null && iss?.V_m3) fields["cabin.V_m3"] = { source: "assumption", note: "no sourced Cygnus free volume: held equal to the ISS habitable volume" };
    return { ...rep.cabin, V_m3: rep.cabin.V_m3 ?? iss?.V_m3 ?? null, fan_off_on_alarm: true };
  }
  const atm = atmosphereById(where);
  if (!atm) return null;
  for (const k of ["x_o2", "P_Pa", "gravity_g", "flow_m_s"] as const) fields[`cabin.${k}`] = { source: "nasa", note: `${atm.name} (${atm.sources[k]?.source_id ?? atm.sources.x_o2?.source_id ?? "missions.json"})` };
  let V = atm.V_m3;
  fields["cabin.V_m3"] = { source: "nasa", note: `${atm.name} volume (${atm.sources.V_m3?.source_id ?? "missions.json"})` };
  const iss = atmosphereById("ISS");
  if (V === null && iss?.V_m3) { V = iss.V_m3; fields["cabin.V_m3"] = { source: "assumption", note: "no sourced module volume: held equal to the ISS habitable volume" }; }
  return { x_o2: atm.x_o2, P_Pa: atm.P_Pa, gravity_g: atm.gravity_g, V_m3: V, flow_m_s: atm.flow_m_s ?? 0, fan_off_on_alarm: true };
}

/** The NASA-tested sample geometry (SAFFIRE-I SIBAL, PSI-98 S1) used when the text gives no size. */
function templateItem(): Item | null {
  const t = presetById("lunar-tune")?.build() as Scenario | undefined;
  return t?.items[0] ?? null;
}

/** Turns answers (+ materials found) into a full Scenario, tagging every field. Pure and deterministic. */
export function buildFromAnswers(answers: Answers, materials: string[], opts: { rejected?: Rejected[]; empty?: boolean; offline?: boolean; name?: string } = {}): BuiltDraft {
  const fields: Record<string, FieldTag> = {};
  const notes: string[] = [];
  const a = { ...answers };
  const missing = ORDER.filter((k) => a[k] == null && !(k === "material" && opts.empty) && !(k === "ignition" && opts.empty)).slice(0, MAX_QUESTIONS);
  const where: Where = a.where ?? "ISS";
  if (!a.where) notes.push("No vehicle stated: ISS atmosphere assumed.");
  const cabin = cabinFor(where, fields);
  if (!a.where) for (const k of Object.keys(fields)) fields[k] = { source: "assumption", note: `assumed ISS: ${fields[k].note}` };
  if (!cabin) return { scenario: null, fields, answers: a, missing, rejected: opts.rejected ?? [], notes: ["Atmosphere data unavailable."], offline: !!opts.offline };
  if (a.o2_percent != null && a.o2_percent > 0 && a.o2_percent <= 100) { cabin.x_o2 = a.o2_percent / 100; fields["cabin.x_o2"] = { source: "user", note: "you said" }; }
  if (a.pressure_kPa != null && a.pressure_kPa > 0) { cabin.P_Pa = a.pressure_kPa * 1e3; fields["cabin.P_Pa"] = { source: "user", note: "you said" }; }

  const tpl = templateItem();
  const mats = [...new Set([...(a.material ? [a.material] : []), ...materials])].filter((k) => materialOf(k));
  const items: Item[] = [];
  if (tpl && !opts.empty) mats.forEach((key, i) => {
    const m = materialOf(key)!;
    const th = m.thicknesses_m[0] ?? tpl.thickness_m;
    items.push({ id: `${key}-${i + 1}`, material_key: key, thickness_m: th, length_m: tpl.length_m, width_m: tpl.width_m, ignite: false, t_ignite_s: 0 });
    fields[`items.${i}.material_key`] = { source: answers.material === key || materials.includes(key) ? "user" : "assumption", note: `${m.display_name}${m.has_burn_data ? " · NASA-tested" : " · smoke data only"}` };
    fields[`items.${i}.thickness_m`] = m.thicknesses_m.length ? { source: "nasa", note: "a PSI-tested thickness" } : { source: "assumption", note: "SIBAL sample thickness (no tested thickness for this material)" };
    fields[`items.${i}.length_m`] = { source: "assumption", note: "sized like the SAFFIRE-I sample (PSI-98 S1)" };
  });
  // Ignition: the first item that can burn, if the text or an answer says something ignites it.
  const igniter = items.find((it) => materialOf(it.material_key)?.ignitable);
  if (a.ignition && a.ignition !== "none" && igniter) {
    igniter.ignite = true; igniter.t_ignite_s = 0;
    fields["ignition"] = { source: answers.ignition ? "user" : "assumption", note: `${ignitionLabel(a.ignition)} at t = 0 s on ${materialOf(igniter.material_key)!.display_name}` };
  } else if (a.ignition && a.ignition !== "none" && items.length) {
    notes.push("None of the named items has NASA burn data, so the ignition source has nothing it can light.");
  }

  const tune = presetById("lunar-tune")?.build() as Scenario | undefined;
  const det = tune?.detection ?? { type: "photoelectric" as const, distance_m: 1, threshold: null };
  const detYes = a.detector !== "no";
  const extYes = a.extinguisher !== "no";
  const detection = { ...det, manual_alarm_s: detYes ? CREW_RESPONSE.manual_alarm_s : null };
  fields["detection"] = { source: a.detector && a.detector !== "unsure" ? "user" : "assumption", note: detYes ? `crew/detector alarm at ${CREW_RESPONSE.manual_alarm_s} s (design input)` : "no alarm" };
  const suppression = extYes ? { agent: CREW_RESPONSE.agent, delay_s: CREW_RESPONSE.delay_s, mass_kg: CREW_RESPONSE.mass_kg } : { agent: "none" as const, delay_s: 0, mass_kg: 0 };
  fields["suppression"] = { source: a.extinguisher && a.extinguisher !== "unsure" ? "user" : "assumption", note: extYes ? `${CREW_RESPONSE.mass_kg} kg CO₂, ${CREW_RESPONSE.delay_s} s after alarm (design input)` : "no extinguisher" };
  cabin.fan_off_on_alarm = a.fan_off !== "no";
  fields["cabin.fan_off_on_alarm"] = { source: a.fan_off && a.fan_off !== "unsure" ? "user" : "assumption", note: cabin.fan_off_on_alarm ? "ventilation shut off on alarm" : "ventilation keeps running" };

  const names: Record<Where, string> = { ISS: "ISS module", MoonBase: "Moon base", LunarHabitat: "Lunar habitat", Mars: "Mars transit", Cygnus: "Cygnus cargo" };
  const raw = { name: opts.name ?? names[where], preset_id: null, cabin, items, detection, suppression, t_end_s: 600 };
  // An empty cabin still needs one item for the schema; it is kept, unignited, and noFire() reports "Nothing to catch fire".
  const parsed = ScenarioSchema.safeParse(raw);
  return { scenario: parsed.success ? parsed.data : (raw as unknown as Scenario), fields, answers: a, missing, rejected: opts.rejected ?? [], notes, offline: !!opts.offline };
}
export const ignitionLabel = (k: Answers["ignition"]) => ({ wire: "Overheated wire", short: "Electrical short", hot_surface: "Hot surface", item: "Ignition source", none: "No ignition" } as Record<string, string>)[k ?? "item"] ?? "Ignition source";

export function buildLocal(text: string): BuiltDraft {
  const p = parseText(text);
  return buildFromAnswers(p.answers, p.materials, { rejected: p.rejected, empty: p.empty, offline: true });
}

/* ---------- interview questions ---------- */
export const QuestionSchema = z.object({
  id: z.enum(["where", "material", "ignition", "detector", "extinguisher", "fan_off"]),
  question: z.string(),
  options: z.array(z.object({ value: z.string(), label: z.string(), badge: z.string().nullable() })).min(1).max(8),
  allowOther: z.boolean(),
});
export const QuestionsSchema = z.object({ questions: z.array(QuestionSchema).max(MAX_QUESTIONS) });
export type Question = z.infer<typeof QuestionSchema>;

export function questionFor(id: Question["id"]): Question {
  switch (id) {
    case "where": return { id, question: "Where is this cabin?", allowOther: false, options: [
      { value: "ISS", label: "ISS", badge: "missions.json" }, { value: "MoonBase", label: "Moon base", badge: "missions.json" },
      { value: "LunarHabitat", label: "Lunar habitat (34 % O₂)", badge: "missions.json" }, { value: "Mars", label: "Mars transit", badge: "missions.json" }] };
    case "material": return { id, question: "What could catch fire?", allowOther: true, options:
      MATERIALS.map((m) => ({ value: m.material_key, label: m.display_name, badge: m.ignitable ? "NASA-tested" : "smoke data only" })).slice(0, 8) };
    case "ignition": return { id, question: "What starts it?", allowOther: true, options: [
      { value: "wire", label: "Overheated wire", badge: null }, { value: "short", label: "Electrical short", badge: null },
      { value: "hot_surface", label: "Hot surface", badge: null }, { value: "none", label: "Nothing ignites", badge: null }] };
    case "detector": case "extinguisher": case "fan_off": return { id, allowOther: false,
      question: id === "detector" ? "Is there a smoke detector / crew alarm?" : id === "extinguisher" ? "Is a CO₂ extinguisher fitted?" : "Does ventilation shut off on alarm?",
      options: [{ value: "yes", label: "Yes", badge: null }, { value: "no", label: "No", badge: null }, { value: "unsure", label: "Not sure", badge: null }] };
  }
}
/** Fixed fallback: questions for the missing fields, then protection, capped at 4. */
export function fixedQuestions(missing: (keyof Answers)[]): Question[] {
  const ids = [...missing.filter((m): m is Question["id"] => ["where", "material", "ignition", "detector"].includes(m as string))];
  for (const extra of ["extinguisher", "fan_off"] as const) if (ids.length < 2) ids.push(extra);
  return QuestionsSchema.parse({ questions: [...new Set(ids)].slice(0, MAX_QUESTIONS).map(questionFor) }).questions;
}
