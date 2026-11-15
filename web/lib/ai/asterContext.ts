import { z } from "zod";

export const AsterContextSchema = z.object({
  kind: z.enum(["run", "studies", "formula"]),
  label: z.string().min(1).max(180),
  facts: z.string().min(1).max(6000),
  question: z.string().min(1).max(300),
});
export type AsterContext = z.infer<typeof AsterContextSchema>;
export const ASTER_CONTEXT_EVENT = "emberatlas:aster-context";
