// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Static-site Ask (GitHub Pages has no server): same behaviour as the /api/ask demo path — serve the cached golden
// answer (tool trace + answer, all numbers from tool outputs) or explain that live AI needs a server.
import cache from "@/data/cache/golden.json";
import { matchGolden } from "./golden";

/* eslint-disable @typescript-eslint/no-explicit-any */
const CACHE = cache as any[];
export const STATIC_NOTE = "static site: live AI needs the server deployment";

export function askStatic(question: string): { trace: any[]; answer: { answer: string; mode: string; guard: any; note: string } } {
  const g = matchGolden(question);
  const c = g ? CACHE.find((x) => x.id === g.id) : undefined;
  if (c) return { trace: c.trace, answer: { answer: c.answer, mode: c.mode, guard: c.guard, note: STATIC_NOTE } };
  return { trace: [], answer: { answer: `Demo mode (${STATIC_NOTE}): only the 12 golden questions are cached. Pick one from the list, or run the models directly in the console.`,
    mode: "offline-demo", guard: { ok: true, unsupported: [] }, note: STATIC_NOTE } };
}
