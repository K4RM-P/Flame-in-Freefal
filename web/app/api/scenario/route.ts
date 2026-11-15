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
import { MAX_QUESTIONS, QuestionsSchema, buildFromAnswers, fixedQuestions, parseText, questionFor, type Answers, type Question } from "@/lib/ai/localScenario";
import { MATERIALS } from "@/lib/sim/params";
import { model } from "@/lib/ai/client";
import { zodTextFormat } from "openai/helpers/zod";
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
  const r = await readJson(req, 8_000);
  if ("error" in r) return r.error;
  const p = Body.safeParse(r.body);
  if (!p.success) return json({ error: "text required (3–2000 characters)" }, 400);
  const { mode, text } = p.data;
  // Only calls that reach OpenAI spend a rate-limit token; the local parser and finalize are cheap and deterministic.
  if (openaiClient() && mode !== "finalize") { const limited = gate(req); if (limited) return limited; }
  const local = parseText(text);
  const ai = mode === "parse" ? await aiAnswers(text) : null;
  const merged: Answers = { ...local.answers, ...Object.fromEntries(Object.entries(ai?.answers ?? {}).filter(([, v]) => v != null)), ...(p.data.answers ?? {}) } as Answers;
  const materials = [...new Set([...(ai?.materials ?? []), ...local.materials])];
  const draft = buildFromAnswers(merged, materials, { rejected: local.rejected, empty: local.empty, offline: !ai });
  if (mode === "parse") return json({ draft, offline: !ai });
  if (mode === "followups") {
    const ai = await aiQuestions(text, draft.missing);
    return json(ai ? { questions: ai, offline: false } : { questions: fixedQuestions(draft.missing), offline: true });
  }
  const v = ScenarioSchema.safeParse(draft.scenario);
  return json({ draft, valid: v.success, issues: v.success ? [] : v.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`), offline: !ai });
}

/** The AI picks and words the follow-ups, but only for missing fields; options are re-validated (materials must be
 *  library keys, other ids keep the fixed option values). Any problem → null (fixed questions). */
async function aiQuestions(text: string, missing: string[]): Promise<Question[] | null> {
  const client = openaiClient();
  if (!client || !missing.length) return null;
  const allowed = [...new Set([...missing, "extinguisher", "fan_off"])].filter((x) => ["where", "material", "ignition", "detector", "extinguisher", "fan_off"].includes(x)) as Question["id"][];
  try {
    const res = await client.responses.parse({
      model: model(), store: false, max_output_tokens: 900, input: text,
      instructions: [
        `You interview an engineer to finish a spacecraft cabin fire scenario. Ask at most ${MAX_QUESTIONS} short questions, most important first.`,
        `Ask ONLY about these missing fields (use them as ids): ${missing.join(", ")}. You may add one of: extinguisher, fan_off, if fewer than 2 questions remain.`,
        "Each option value must be one of the allowed values for its id:",
        ...allowed.map((id) => `- ${id}: ${questionFor(id).options.map((o) => o.value).join(" | ")}`),
        "Labels are short and plain; badge is \"NASA-tested\" for materials with burn data, else null. Never invent materials or numbers.",
      ].join("\n"),
      text: { format: zodTextFormat(QuestionsSchema, "followups") },
    });
    const out = res.output_parsed?.questions ?? [];
    const keys = new Set(MATERIALS.map((m) => m.material_key));
    const clean = out.filter((q) => allowed.includes(q.id)).map((q) => {
      const fixed = questionFor(q.id);
      const valid = new Set(fixed.options.map((o) => o.value));
      const options = q.options.filter((o) => valid.has(o.value) && (q.id !== "material" || keys.has(o.value)))
        .map((o) => ({ ...o, badge: fixed.options.find((f) => f.value === o.value)?.badge ?? null }));
      return { ...q, options: options.length ? options : fixed.options, allowOther: fixed.allowOther };
    }).filter((q, i, arr) => arr.findIndex((x) => x.id === q.id) === i).slice(0, MAX_QUESTIONS);
    return clean.length ? QuestionsSchema.parse({ questions: clean }).questions : null;
  } catch (e) { console.error("followups AI failed; fixed questions:", (e as Error)?.message); return null; }
}
