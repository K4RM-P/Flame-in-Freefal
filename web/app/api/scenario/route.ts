// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// POST {mode, text, answers?} → the AI interview contract.
//   parse     → {draft}                 text → answers + full draft (every field tagged nasa / user / assumption)
//   followups → {questions[] (≤ 4)}     questions only for fields the draft is still missing
//   finalize  → {draft, valid, issues}  ScenarioSchema-validated scenario
// No key, or an OpenAI failure → the rule-based parser and fixed questions (offline: true). Nothing runs here.
import { z } from "zod";
import { openaiClient } from "@/lib/ai/client";
import { gate, json, readJson } from "@/lib/ai/http";
import { buildScenario } from "@/lib/ai/scenario";
import { buildFromAnswers, fixedQuestions, parseText, type Answers } from "@/lib/ai/localScenario";
import { ScenarioSchema } from "@/lib/sim/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AnswersSchema = z.object({
  where: z.enum(["ISS", "MoonBase", "LunarHabitat", "Mars", "Cygnus"]).nullish(), material: z.string().nullish(),
  ignition: z.enum(["wire", "short", "hot_surface", "item", "none"]).nullish(),
  detector: z.enum(["yes", "no", "unsure"]).nullish(), extinguisher: z.enum(["yes", "no", "unsure"]).nullish(), fan_off: z.enum(["yes", "no", "unsure"]).nullish(),
  o2_percent: z.number().nullish(), pressure_kPa: z.number().nullish(),
}).partial();
const Body = z.object({ mode: z.enum(["parse", "followups", "finalize"]).default("parse"), text: z.string().trim().min(3).max(2000), answers: AnswersSchema.optional() });

/** The model's draft, mapped onto interview answers (materials must already be library keys). */
async function aiAnswers(text: string): Promise<{ answers: Answers; materials: string[] } | null> {
  const client = openaiClient();
  if (!client) return null;
  try {
    const r = await buildScenario(client, text);
    const s = r.scenario as { cabin?: { x_o2?: number | null; P_Pa?: number | null }; items?: { material_key: string; ignite?: boolean }[] };
    const materials = (s.items ?? []).map((i) => i.material_key);
    return { answers: { o2_percent: s.cabin?.x_o2 != null ? s.cabin.x_o2 * 100 : null, pressure_kPa: s.cabin?.P_Pa != null ? s.cabin.P_Pa / 1e3 : null, ignition: (s.items ?? []).some((i) => i.ignite) ? "item" : null }, materials };
  } catch (e) { console.error("scenario AI failed; using the local parser:", (e as Error)?.message); return null; }
}

export async function POST(req: Request) {
  const limited = gate(req);
  if (limited) return limited;
  const r = await readJson(req, 8_000);
  if ("error" in r) return r.error;
  const p = Body.safeParse(r.body);
  if (!p.success) return json({ error: "text required (3–2000 characters)" }, 400);
  const { mode, text } = p.data;
  const local = parseText(text);
  const ai = mode === "parse" ? await aiAnswers(text) : null;
  const merged: Answers = { ...local.answers, ...Object.fromEntries(Object.entries(ai?.answers ?? {}).filter(([, v]) => v != null)), ...(p.data.answers ?? {}) } as Answers;
  const materials = [...new Set([...(ai?.materials ?? []), ...local.materials])];
  const draft = buildFromAnswers(merged, materials, { rejected: local.rejected, empty: local.empty, offline: !ai });
  if (mode === "parse") return json({ draft, offline: !ai });
  if (mode === "followups") return json({ questions: fixedQuestions(draft.missing), offline: true });
  const v = ScenarioSchema.safeParse(draft.scenario);
  return json({ draft, valid: v.success, issues: v.success ? [] : v.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`), offline: !ai });
}
