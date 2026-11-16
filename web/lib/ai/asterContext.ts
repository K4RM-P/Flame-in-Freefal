// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
import { z } from "zod";
import { RunFactsSchema } from "./runFactsSchema";
import { explainRun } from "./explain";

export const AsterContextSchema = z.object({
  kind: z.enum(["run", "studies", "formula"]),
  label: z.string().min(1).max(180),
  facts: z.string().min(1).max(6000),
  question: z.string().min(1).max(300),
  /** Structured run facts (simulator only): lets Aster answer from the run, not from page text. */
  data: RunFactsSchema.optional(),
});
export type AsterContext = z.infer<typeof AsterContextSchema>;
export const ASTER_CONTEXT_EVENT = "emberatlas:aster-context";

export const AI_OFFLINE_NOTE = "AI offline: explanations are generated locally from the engine.";

/** Offline answer for a context question: the engine's own facts, verbatim, under the offline note. Never invents text. */
export function localContextAnswer(ctx: AsterContext, question = ""): string {
  if (ctx.data) return `${AI_OFFLINE_NOTE}\n\n${explainRun(question || ctx.question, ctx.data).text}`;
  return `${AI_OFFLINE_NOTE}\n\n${ctx.label}\n${ctx.facts}`;
}
