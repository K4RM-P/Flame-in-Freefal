// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Wire format of the run facts Aster receives (validated server-side). Kept free of engine imports.
import { z } from "zod";

export const SideFactsSchema = z.object({
  label: z.string().max(120),
  material: z.string().max(120), thickness_mm: z.number(), material_max_o2_pct: z.number().nullable(),
  x_o2_pct: z.number(), P_kPa: z.number(), gravity_g: z.number(), flow_cm_s: z.number(), V_m3: z.number().nullable(),
  end: z.object({ kind: z.enum(["quench", "burnout", "inerting", "burning", "no-fire"]), t_s: z.number().nullable(), short: z.string().max(40), phrase: z.string().max(300) }),
  peak_heat_W: z.number(), peak_T_K: z.number().nullable(), min_ppO2_kPa: z.number().nullable(), peak_CO2_pct: z.number().nullable(),
  alarm_s: z.number().nullable(), fan_off_s: z.number().nullable(), agent_s: z.number().nullable(), agent: z.string().max(10), agent_kg: z.number(),
  extrapolated: z.array(z.string().max(300)).max(8),
  material_sources: z.array(z.string().max(12)).max(4),
  evidence: z.array(z.object({ accession: z.string().max(12), title: z.string().max(140), role: z.string().max(40) })).max(4),
  fixes: z.array(z.object({ title: z.string().max(200), before: z.string().max(40), after: z.string().max(40), basis: z.string().max(20) })).max(3),
  next_test: z.object({ condition: z.string().max(300), rig: z.string().max(400), investigations: z.array(z.string().max(12)).max(6) }).nullable(),
});
export const RunFactsSchema = z.object({
  sides: z.array(SideFactsSchema).min(1).max(2),
  quench: z.object({ cm_s: z.number(), source: z.string().max(60), status: z.string().max(30), note: z.string().max(300) }),
  compare: z.object({ ratio: z.number(), longer: z.string().max(120), shorter: z.string().max(120) }).nullable(),
  fm2: z.object({ id: z.string().max(40), url: z.string().max(120), title: z.string().max(160), note: z.string().max(400) }),
});
export type SideFacts = z.infer<typeof SideFactsSchema>;
export type RunFacts = z.infer<typeof RunFactsSchema>;

