// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Shared contract for the cabin fire simulator (engine ↔ UI ↔ AI routes). Internal units SI.
import { z } from "zod";

export const GRAVITY = { ug: 0, moon: 0.165, mars: 0.378, earth: 1 } as const;

export const ItemSchema = z.object({
  id: z.string(),
  material_key: z.string(),          // key in web/data/materials.json
  thickness_m: z.number().positive(),
  length_m: z.number().positive(),
  width_m: z.number().positive(),
  ignite: z.boolean().default(false), // ignition source at t_ignite_s
  t_ignite_s: z.number().min(0).default(0),
});
export const ScenarioSchema = z.object({
  name: z.string().default("Scenario"),
  preset_id: z.string().nullable().default(null),
  cabin: z.object({
    x_o2: z.number().min(0).max(1),
    P_Pa: z.number().positive(),
    gravity_g: z.number().min(0).max(1),
    V_m3: z.number().positive().nullable(),  // null = required user field (unsourced)
    flow_m_s: z.number().min(0),               // ventilation speed past the item
    fan_off_on_alarm: z.boolean(),
  }),
  items: z.array(ItemSchema).min(1),
  detection: z.object({
    type: z.enum(["photoelectric", "ionization"]),
    distance_m: z.number().positive(),
    threshold: z.number().positive().nullable(), // smoke mass concentration at the detector, kg/m³; null = required (no sourced value)
    manual_alarm_s: z.number().min(0).nullable().optional(), // crew-reported alarm time (design input); used when no detector alarm fires earlier
  }),
  suppression: z.object({
    agent: z.enum(["none", "CO2", "N2"]),
    delay_s: z.number().min(0),
    mass_kg: z.number().min(0),
  }),
  t_end_s: z.number().positive().max(600).default(600),
});
export type Scenario = z.infer<typeof ScenarioSchema>;
export type Item = z.infer<typeof ItemSchema>;

/** One traceable source behind a value: PSI accession + file#row, a cited paper, or an engine run. */
export interface Provenance { source_id: string; locator?: string; doi?: string; note?: string }

export interface CabinState {
  T_K: number; P_Pa: number; x_o2: number; p_o2_Pa: number; y_o2: number;
  x_co2: number; x_co: number; smoke_det: number; Q_W: number; burning_area_m2: number;
}
export type EventKind = "ignition" | "alarm" | "fan_off" | "agent_released" | "extinguished" | "limit_exceeded";
export interface SimEvent { t_s: number; kind: EventKind; item_id?: string; detail: string }
export interface ItemTrace { id: string; burning_area_m2: number[]; front_m: number[]; status: ("idle" | "burning" | "out")[]; extinguish_reason?: "burnout" | "inerting" | "quench" }
export type Band = { p05: number; p50: number; p95: number };
export interface SimBands { [K: string]: { p05: number[]; p50: number[]; p95: number[] } }

export interface SimResult {
  t: number[];
  state: CabinState[];
  bands?: SimBands;                         // MC only, keyed by CabinState field
  events: SimEvent[];
  items: ItemTrace[];
  warnings: string[];                       // out-of-envelope, theory-only, partial-gravity bounds…
  outcome: Outcome;
  /** Machine-readable caveats the result strip can show (partial_g_nonconservative: FM2, NTRS 20240015307). */
  flags?: { partial_g_nonconservative?: boolean };
  provenance: { sources: Provenance[]; params: Record<string, { calibrated: boolean; source: string }>; seed: number; engine_version: string };
}
export interface OutcomeMetric { key: string; label: string; value: number | null; units: string; theory_only?: boolean; band?: Band; limit?: number; limit_source?: string; pass?: boolean | null }
export interface Outcome {
  metrics: OutcomeMetric[];                 // time_to_alarm, time_to_extinguish, peak_T, min_o2, peak_co, peak_co2
  probabilities?: { key: string; label: string; p: number }[]; // MC: e.g. "CO limit exceeded"
}
