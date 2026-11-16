// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
import { z } from "zod";
import { RunFactsSchema } from "./runFactsSchema";
import { explainRun } from "./explain";

export const AsterContextSchema = z.object({
  kind: z.enum(["run", "studies", "formula"]),
  label: z.string().min(1).max(180),
  facts: z.string().min(1).max(6000),
  question: z.string().min(1).max(300),
  /** Structured run facts (simulator only): lets Aster answer the question from the run, not from page text. */
  data: RunFactsSchema.optional(),
});
export type AsterContext = z.infer<typeof AsterContextSchema>;
export const ASTER_CONTEXT_EVENT = "emberatlas:aster-context";

export const AI_OFFLINE_NOTE = "SI offline: explanations are generated locally from the engine.";

/** Offline answer for a context question: the engine's own facts, verbatim, under the offline note, plus the matched
 *  NASA records (ids and titles only). Never invents text. */
export function localContextAnswer(ctx: AsterContext, sources: { id: string; title: string; external?: boolean }[] = [], question = ""): string {
  if (ctx.data) return `${AI_OFFLINE_NOTE}\n\n${explainRun(question || ctx.question, ctx.data).text}`;
  const evidence = sources.length
    ? `\n\nRelated NASA evidence: ${sources.map((x) => `${x.id} (${x.title.replace(/,? NTRS \d+/, "").replace(/ - OUTSIDE PSI$/, "")}${x.external ? ", outside PSI" : ""})`).join("; ")}.`
    : "";
  return `${AI_OFFLINE_NOTE}\n\n${ctx.label}\n${ctx.facts}${evidence}`;
}
