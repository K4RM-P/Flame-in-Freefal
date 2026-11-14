// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Plain English → scenario draft. The model fills a human-unit draft (strict JSON schema); this module converts it to SI,
// rejects materials outside web/data/materials.json, and leaves anything the text does not state as null (never invented).
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import type OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { GRAVITY, ScenarioSchema } from "@/lib/sim/types";
import { model } from "./client";

export interface LibraryMaterial { material_key: string; display_name: string; has_burn_data?: boolean; has_smoke_data?: boolean }

/** Read lazily so the route still answers (with an empty library) while the data pipeline has not produced the file. */
export function loadMaterials(file = path.join(process.cwd(), "data", "materials.json")): LibraryMaterial[] {
  try {
    const raw = JSON.parse(fs.readFileSync(file, "utf8"));
    const list = Array.isArray(raw) ? raw : (raw.materials ?? []);
    return (list as LibraryMaterial[]).filter((m) => typeof m?.material_key === "string");
  } catch { return []; }
}

const n = z.number().nullable();
export const DraftSchema = z.object({
  name: z.string().nullable(),
  cabin: z.object({
    o2_percent: n, pressure_kPa: n,
    gravity: z.enum(["ug", "moon", "mars", "earth"]).nullable(),
    volume_m3: n, flow_cm_s: n, fan_off_on_alarm: z.boolean().nullable(),
  }),
  items: z.array(z.object({
    material_key: z.string().nullable(), requested_material: z.string(),
    thickness_mm: n, length_cm: n, width_cm: n, ignite: z.boolean().nullable(), t_ignite_s: n,
  })),
  detection: z.object({ type: z.enum(["photoelectric", "ionization"]).nullable(), distance_m: n, threshold_mg_m3: n }),
  suppression: z.object({ agent: z.enum(["none", "CO2", "N2"]).nullable(), delay_s: n, mass_kg: n }),
  t_end_s: n,
  notes: z.array(z.string()),
});
export type Draft = z.infer<typeof DraftSchema>;

export function instructions(lib: LibraryMaterial[]): string {
  const mats = lib.map((m) => `- ${m.material_key}: ${m.display_name}${m.has_burn_data ? "" : " (smoke source only, cannot ignite)"}`).join("\n");
  return [
    "You convert a plain-English description of a spacecraft or habitat cabin fire scenario into a JSON draft.",
    "Rules:",
    "- Fill a field ONLY if the text states it or it follows unambiguously (\"on the Moon\" → gravity moon; \"ISS\" alone does not give a volume).",
    "- Every field the text does not state is null. Never invent numbers, volumes, limits or thresholds.",
    "- Units: o2_percent in % by volume, pressure_kPa in kPa, flow_cm_s in cm/s, thickness_mm in mm, length_cm/width_cm in cm, distances in m, delays in s, mass in kg, detector threshold_mg_m3 as smoke mass concentration in mg/m³.",
    "- material_key must be one of the keys below, or null if the requested material is not in the library. Always copy the user's wording into requested_material.",
    "- Put any assumption or ambiguity in notes, one short sentence each.",
    "Material library (keys):",
    mats || "- (library unavailable: set every material_key to null)",
  ].join("\n");
}

export interface ScenarioDraftResponse {
  scenario: Record<string, unknown>; // SI, same shape as ScenarioSchema; null = user must fill
  valid: boolean;                    // true when ScenarioSchema accepts it as-is
  missing: string[];                 // dotted paths still null
  notes: string[];
  rejected: { requested: string; reason: string }[];
}

const mul = (x: number | null, k: number) => (x === null ? null : x * k);

export function draftToScenario(d: Draft, lib: LibraryMaterial[]): ScenarioDraftResponse {
  const keys = new Map(lib.map((m) => [m.material_key, m]));
  const rejected: ScenarioDraftResponse["rejected"] = [];
  const notes = [...d.notes];
  const available = lib.map((m) => m.material_key).join(", ") || "none (materials.json not loaded)";
  const items = d.items.flatMap((it, i) => {
    const m = it.material_key ? keys.get(it.material_key) : undefined;
    if (!m) {
      rejected.push({ requested: it.requested_material, reason: `not in the PSI material library; available: ${available}` });
      return [];
    }
    let ignite = it.ignite;
    if (ignite && m.has_burn_data === false) {
      ignite = false;
      notes.push(`${m.display_name} has PSI smoke data only, so it is a smoke source and cannot be the ignition item.`);
    }
    return [{
      id: `item-${i + 1}`, material_key: m.material_key,
      thickness_m: mul(it.thickness_mm, 1e-3), length_m: mul(it.length_cm, 1e-2), width_m: mul(it.width_cm, 1e-2),
      ignite: ignite ?? false, t_ignite_s: it.t_ignite_s ?? 0,
    }];
  });
  const scenario = {
    name: d.name ?? "Scenario", preset_id: null,
    cabin: {
      x_o2: mul(d.cabin.o2_percent, 0.01), P_Pa: mul(d.cabin.pressure_kPa, 1e3),
      gravity_g: d.cabin.gravity === null ? null : GRAVITY[d.cabin.gravity],
      V_m3: d.cabin.volume_m3, flow_m_s: mul(d.cabin.flow_cm_s, 1e-2), fan_off_on_alarm: d.cabin.fan_off_on_alarm,
    },
    items,
    detection: { type: d.detection.type, distance_m: d.detection.distance_m, threshold: mul(d.detection.threshold_mg_m3, 1e-6) },
    suppression: { ...d.suppression },
    t_end_s: d.t_end_s === null ? null : Math.min(600, d.t_end_s),
  };
  const missing: string[] = [];
  const walk = (o: unknown, p: string) => {
    if (o === null) missing.push(p);
    else if (Array.isArray(o)) o.forEach((x, i) => walk(x, `${p}[${i}]`));
    else if (typeof o === "object") for (const [k, v] of Object.entries(o as object)) walk(v, p ? `${p}.${k}` : k);
  };
  walk(scenario, "");
  if (!items.length) missing.push("items");
  return { scenario, valid: ScenarioSchema.safeParse(scenario).success, missing, notes, rejected };
}

export async function buildScenario(client: OpenAI, text: string, lib = loadMaterials()): Promise<ScenarioDraftResponse> {
  const res = await client.responses.parse({
    model: model(), store: false, instructions: instructions(lib), input: text, max_output_tokens: 2000,
    text: { format: zodTextFormat(DraftSchema, "scenario_draft") },
  });
  const draft = res.output_parsed;
  if (!draft) throw new Error("model returned no scenario draft");
  return draftToScenario(DraftSchema.parse(draft), lib);
}
