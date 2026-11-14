// Deterministic agent tools over the same TS physics and data the UI uses (zod-validated inputs).
import { z } from "zod";
import * as M from "@/lib/physics/models";
import { INVESTIGATIONS, rank, DEFAULT_WEIGHTS } from "@/lib/ranking";
import { TEST_POINTS } from "@/lib/testPoints";
import { CONFLICTS, COVERAGE, proposeExperiments } from "@/lib/gaps";
import { source } from "@/lib/sources";
import { MISSIONS } from "@/lib/missions";
import summary from "@/data/validation/summary.json";

const mission = z.object({ x_o2: z.number().min(0.05).max(1), P_kPa: z.number().min(10).max(400), flow_cm_s: z.number().min(0).max(200).default(5), gravity_g: z.number().min(0).max(1).default(0) });
const round = (x: unknown): unknown => (typeof x === "number" ? Number(x.toPrecision(4)) : Array.isArray(x) ? x.map(round) : x && typeof x === "object" ? Object.fromEntries(Object.entries(x).map(([k, v]) => [k, round(v)])) : x);
const slim = (r: M.ModelResult) => round({ ...r, extra: Object.fromEntries(Object.entries(r.extra).filter(([k]) => k !== "series")) });

export const TOOLS = {
  rank_investigations: { description: "Rank PSI investigations by relevance to a mission atmosphere (atmosphere, flow, fuel realism, scale, pillar, data richness).",
    schema: z.object({ mission, weights: z.record(z.number()).optional() }),
    run: (a: { mission: z.infer<typeof mission>; weights?: Record<string, number> }) => rank(a.mission, { ...DEFAULT_WEIGHTS, ...(a.weights ?? {}) }).map((r) => round({ id: r.id, name: r.name, score: r.score, n_points: r.n_points, why: Object.fromEntries(Object.entries(r.parts).map(([k, p]) => [k, p.why])) })) },
  get_investigation: { description: "Full card for one investigation (objective, hardware, fuels, conditions, findings, sources).",
    schema: z.object({ id: z.string() }), run: (a: { id: string }) => INVESTIGATIONS.find((i) => i.id.toLowerCase() === a.id.toLowerCase()) ?? { error: `unknown id; known: ${INVESTIGATIONS.map((i) => i.id).join(", ")}` } },
  query_test_points: { description: "Query verified PSI test points (FLEX droplets). Returns counts, summary stats and up to 15 rows with provenance.",
    schema: z.object({ fuel: z.string().optional(), diluent: z.enum(["N2", "CO2", "HE"]).optional(), x_o2_min: z.number().optional(), x_o2_max: z.number().optional(), outcome: z.string().optional() }),
    run: (a: { fuel?: string; diluent?: string; x_o2_min?: number; x_o2_max?: number; outcome?: string }) => {
      const q = TEST_POINTS.filter((t) => (!a.fuel || t.fuel === a.fuel) && (!a.diluent || t.diluent === a.diluent) && (a.x_o2_min == null || t.x_o2 >= a.x_o2_min) && (a.x_o2_max == null || t.x_o2 <= a.x_o2_max) && (!a.outcome || t.outcome === a.outcome || t.test_end === a.outcome));
      const Ks = q.map((t) => t.K_mm2_s).filter((k): k is number => k != null);
      return round({ n: q.length, investigations: [...new Set(q.map((t) => t.investigation_id))], K_mean: Ks.length ? Ks.reduce((s, k) => s + k, 0) / Ks.length : null,
        x_o2_range: q.length ? [Math.min(...q.map((t) => t.x_o2)), Math.max(...q.map((t) => t.x_o2))] : null,
        rows: q.slice(0, 15).map((t) => ({ id: t.test_label, fuel: t.fuel, x_o2: t.x_o2, P_kPa: t.pressure_kpa, diluent: t.diluent, x_diluent: t.x_diluent, d0_mm: t.d0_mm, K_mm2_s: t.K_mm2_s, d_ext_mm: t.d_ext_mm, outcome: t.outcome, source_id: t.source_id, locator: t.locator })) });
    } },
  run_spread: { description: "Opposed-flow flame spread (de Ris + gravity-equivalent flow). material: sibal|cotton|pmma. Returns value mm/s with p05-p95 band and validity.",
    schema: z.object({ material: z.enum(["sibal", "cotton", "pmma"]), x_o2: z.number(), P_kPa: z.number(), flow_cm_s: z.number(), thickness_mm: z.number().nullable().optional(), gravity_g: z.number().default(0) }),
    run: (a: { material: string; x_o2: number; P_kPa: number; flow_cm_s: number; thickness_mm?: number | null; gravity_g?: number }) => slim(M.runSpread(a.material, a.x_o2, a.P_kPa, a.flow_cm_s, a.thickness_mm ?? null, a.gravity_g ?? 0, "opposed", 300)) },
  run_droplet: { description: "Droplet burning rate K, extinction diameters and model LOI context. fuel: n-heptane|methanol. diluent N2|CO2|HE with x_diluent.",
    schema: z.object({ fuel: z.enum(["n-heptane", "methanol"]), x_o2: z.number(), P_kPa: z.number(), d0_mm: z.number(), diluent: z.enum(["N2", "CO2", "HE"]).default("N2"), x_diluent: z.number().default(0) }),
    run: (a: { fuel: string; x_o2: number; P_kPa: number; d0_mm: number; diluent?: string; x_diluent?: number }) => slim(M.runDroplet(a.fuel, a.x_o2, a.P_kPa, a.d0_mm, a.diluent ?? "N2", a.x_diluent ?? 0, 300)) },
  run_suppression: { description: "Agent mole fraction to inert a diffusion flame (critical flame temperature), µg-calibrated and 1 g reference. agent CO2|N2|HE.",
    schema: z.object({ fuel: z.enum(["n-heptane", "methanol", "pmma", "cotton"]), x_o2: z.number(), P_kPa: z.number(), agent: z.enum(["CO2", "N2", "HE"]) }),
    run: (a: { fuel: string; x_o2: number; P_kPa: number; agent: string }) => slim(M.runSuppression(a.fuel, a.x_o2, a.P_kPa, a.agent, 200)) },
  run_boundary: { description: "Flammability boundary probability P(burn). Not built yet (needs digitized solid burn/extinct data).",
    schema: z.object({ x_o2: z.number(), P_kPa: z.number(), flow_cm_s: z.number(), gravity_g: z.number().default(0) }),
    run: () => ({ status: "not_available", reason: "U7 boundary model needs BASS-II/Saffire/BRE burn-extinct outcomes; only FLEX droplet data are verified so far.", sources: ["bass2-sci-rep-2017", "dehghani-bre"] }) },
  run_habitat: { description: "Closed-cabin fire consequence: T, P, O2, CO2, CO time histories and time to 1 h exposure limits.",
    schema: z.object({ material: z.enum(["cotton", "pmma", "n-heptane", "methanol", "sibal"]), x_o2: z.number(), P_kPa: z.number(), V_m3: z.number(), Q_kW: z.number(), t_burn_s: z.number(), t_end_s: z.number().default(1800) }),
    run: (a: { material: string; x_o2: number; P_kPa: number; V_m3: number; Q_kW: number; t_burn_s: number; t_end_s?: number }) => {
      const r = M.runHabitat(a.material, a.x_o2, a.P_kPa, a.V_m3, a.Q_kW, a.t_burn_s, a.t_end_s ?? 1800, 0, false, 30);
      const s = r.extra.series as Record<string, number[]>;
      const iEnd = s.t.findIndex((t) => t >= a.t_burn_s);
      return round({ ...(slim(r) as object), at_end_of_burn: { t_s: s.t[iEnd], T_C: s.T[iEnd] - 273.15, P_kPa: s.P[iEnd] / 1e3, x_o2: s.x_o2[iEnd], x_co2: s.x_co2[iEnd], co_ppm: s.x_co[iEnd] * 1e6 } });
    } },
  run_smoke: { description: "Smoke particle size after a transport time (Brownian coagulation) and favoured detector principle.",
    schema: z.object({ transport_s: z.number(), N0_m3: z.number().optional(), d0_nm: z.number().optional() }),
    run: (a: { transport_s: number; N0_m3?: number; d0_nm?: number }) => slim(M.runSmoke(a.transport_s, a.N0_m3, a.d0_nm)) },
  gravity_map: { description: "Gravity-equivalent flow (bounded estimate) for µg/Moon/Mars/1 g at an atmosphere.",
    schema: z.object({ x_o2: z.number(), P_kPa: z.number(), flow_cm_s: z.number(), gravity_g: z.number() }),
    run: (a: { x_o2: number; P_kPa: number; flow_cm_s: number; gravity_g: number }) => slim(M.runGravity(a.x_o2, a.P_kPa, a.flow_cm_s, a.gravity_g)) },
  coverage_gaps: { description: "Where verified PSI data exist (O2 x P x g), plus the list of conflicting evidence.",
    schema: z.object({ mission: mission.optional() }),
    run: () => ({ cells_with_data: COVERAGE.filter((c) => c.n > 0), partial_gravity_points: 0, note: "verified points are FLEX droplets only; solids pending digitization", conflicts: CONFLICTS }) },
  propose_experiments: { description: "Coverage-based next test points near a mission (fallback for GP active learning).",
    schema: z.object({ mission, n: z.number().int().min(1).max(10).default(5) }),
    run: (a: { mission: z.infer<typeof mission>; n?: number }) => ({ method: "coverage-based heuristic (GP/BALD pending boundary data)", proposals: proposeExperiments(a.mission, a.n ?? 5) }) },
  get_sources: { description: "Citation metadata for source ids.", schema: z.object({ ids: z.array(z.string()) }), run: (a: { ids: string[] }) => a.ids.map(source) },
  get_validation: { description: "Validation Lab table (V1-V10 with published vs predicted and pass/fail).", schema: z.object({}), run: () => summary },
  list_missions: { description: "Mission atmosphere presets (O2, pressure, gravity, volume).", schema: z.object({}), run: () => MISSIONS },
  set_ui: { description: "Suggest a UI view to open (console, models/<id>, validation, evidence, gaps).", schema: z.object({ view: z.string(), filters: z.record(z.unknown()).optional() }),
    run: (a: { view: string }) => ({ ok: true, href: `/${a.view.replace(/^\//, "")}` }) },
} as const;

export type ToolName = keyof typeof TOOLS;

/** JSON schema for the Anthropic tools API (zod → JSON schema, minimal converter for the shapes used here). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toJson(s: any): any {
  const d = s._def;
  switch (d.typeName) {
    case "ZodObject": { const shape = d.shape(); const req = Object.entries(shape).filter(([, v]: [string, any]) => !v.isOptional()).map(([k]) => k);
      return { type: "object", properties: Object.fromEntries(Object.entries(shape).map(([k, v]) => [k, toJson(v)])), ...(req.length ? { required: req } : {}) }; }
    case "ZodNumber": return { type: d.checks?.some((c: any) => c.kind === "int") ? "integer" : "number" };
    case "ZodString": return { type: "string" };
    case "ZodEnum": return { type: "string", enum: d.values };
    case "ZodArray": return { type: "array", items: toJson(d.type) };
    case "ZodRecord": return { type: "object" };
    case "ZodOptional": case "ZodNullable": return toJson(d.innerType);
    case "ZodDefault": return toJson(d.innerType);
    default: return {};
  }
}
export const TOOL_DEFS = (Object.entries(TOOLS) as [ToolName, (typeof TOOLS)[ToolName]][]).map(([name, t]) => ({ name, description: t.description, input_schema: toJson(t.schema) }));

export function runTool(name: string, input: unknown): unknown {
  const t = TOOLS[name as ToolName];
  if (!t) return { error: `unknown tool ${name}` };
  const parsed = t.schema.safeParse(input ?? {});
  if (!parsed.success) return { error: "invalid input", issues: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) };
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (t.run as (a: any) => unknown)(parsed.data);
  } catch (e) {
    return { error: String(e) };
  }
}
