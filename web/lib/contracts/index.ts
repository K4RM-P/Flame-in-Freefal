// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Zod mirrors of the data instance's contract (web/data/*.json). New fields are optional until the data push lands.
import { z } from "zod";

const num = z.number().finite();
const range = z.tuple([num, num]);

export const Outcome = z.enum(["burn", "extinct", "no_ignition", "insignificant", "cool_flame", "unknown"]);
export type Outcome = z.infer<typeof Outcome>;

export const Investigation = z.object({
  name: z.string(),
  accession: z.string().regex(/^PSI-\d+$/).optional(),
  psi_id: z.union([z.string(), num]).optional(),
  doi: z.string().nullable().optional(),
  psi_investigation_url: z.string().url().nullable().optional(),
  title_official: z.string().optional(),
  objective_official: z.string().optional(),
  files_used: z.array(z.string()).optional(),
  n_verified_rows: z.number().int().nonnegative().optional(),
}).passthrough();
export const Investigations = z.record(Investigation);
export type Investigation = z.infer<typeof Investigation>;

export const TestPoint = z.object({
  id: z.string(),
  investigation_id: z.string(),
  x_o2: num.min(0).max(1),
  pressure_kpa: num.positive(),
  flow_cm_s: num.nullable(),
  gravity_g: num.min(0),
  outcome: z.string(),
  source_id: z.string(),
  locator: z.string(),
  verified: z.boolean(),
  material_key: z.string().optional(),
  thickness_mm: num.nullable().optional(),
  flow_dir: z.string().nullable().optional(),
  x_o2_initial: num.nullable().optional(),
  x_o2_final: num.nullable().optional(),
  approx: z.boolean().optional(),
  outcome_raw: z.string().nullable().optional(),
  spread_rate_mm_s: num.nullable().optional(),
  burn_length_cm: num.nullable().optional(),
  aging_s: num.nullable().optional(),
  flags: z.array(z.string()).optional(),
}).passthrough();
export const TestPoints = z.array(TestPoint);
export type TestPoint = z.infer<typeof TestPoint>;

export const Material = z.object({
  material_key: z.string(),
  display_name: z.string(),
  class: z.string(),
  forms: z.array(z.string()),
  investigations: z.array(z.string()),
  n_tests: z.number().int().nonnegative(),
  o2_range_tested: range.nullable(),
  p_range_kpa: range.nullable(),
  flow_range_cm_s: range.nullable(),
  gravity_levels_tested: z.array(num),
  has_burn_data: z.boolean(),
  has_smoke_data: z.boolean(),
  has_1g_comparison: z.boolean(),
  notes: z.string().nullable().optional(),
}).passthrough();
export const Materials = z.array(Material);
export type Material = z.infer<typeof Material>;

const Side = z.object({
  outcome: z.string().nullable(),
  burn_length_cm: num.nullable().optional(),
  spread_rate_mm_s: num.nullable().optional(),
}).passthrough();
export const EarthVsOrbitRow = z.object({
  material_key: z.string(),
  thickness_mm: num.nullable(),
  ug: Side.extend({ x_o2: num.nullable().optional(), flow_cm_s: num.nullable().optional(), flow_dir: z.string().nullable().optional() }),
  one_g: Side,
  agreement: z.enum(["same", "orbit_worse", "orbit_better", "not_comparable"]),
  n: z.number().int().nonnegative(),
  source_id: z.string(),
  locator: z.string(),
  caveat: z.string().nullable().optional(),
}).passthrough();
export const EarthVsOrbit = z.array(EarthVsOrbitRow);
export type EarthVsOrbitRow = z.infer<typeof EarthVsOrbitRow>;

const Ranked = z.object({ investigation: z.string(), why: z.string(), source: z.string().optional() }).passthrough();
export const EvidenceIndex = z.record(z.object({ Q1: z.array(Ranked).optional(), Q2: z.array(Ranked).optional(), Q3: z.array(Ranked).optional() }).passthrough());
export type EvidenceIndex = z.infer<typeof EvidenceIndex>;

export const Boundary = z.union([
  z.object({ available: z.literal(false), reason: z.string() }),
  z.object({ available: z.literal(true).optional(), grid: z.record(z.any()), p05: z.any(), p50: z.any(), p95: z.any(), envelope: z.any() }).passthrough(),
]);
export type Boundary = z.infer<typeof Boundary>;

/** Everything buildReview needs. A null field means the file has not landed yet ("Data pending"). */
export interface ReviewData {
  investigations: Record<string, Investigation>;
  testPoints: TestPoint[];
  materials: Material[] | null;
  earthVsOrbit: EarthVsOrbitRow[] | null;
  evidenceIndex: EvidenceIndex | null;
  boundary: Boundary | null;
}

export const CONTRACT_FILES = {
  "investigations.json": Investigations,
  "test_points.json": TestPoints,
  "materials.json": Materials,
  "earth_vs_orbit.json": EarthVsOrbit,
  "evidence_index.json": EvidenceIndex,
  "boundary.json": Boundary,
} as const;
