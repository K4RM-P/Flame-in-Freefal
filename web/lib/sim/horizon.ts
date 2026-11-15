// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Display-only horizon: the timeline shows up to the last meaningful event (fire out / agent released) + 15 %.
// The engine run itself is untouched; this only trims the visible scrub range.
import type { SimEvent } from "./types";

const MEANINGFUL = new Set(["extinguished", "agent_released"]);
export const HORIZON_PAD = 1.15;

/** Last frame index to show, given the run's time grid and all events (both runs in a comparison). */
export function visibleLastIndex(t: number[], events: SimEvent[][]): number {
  const last = t.length - 1;
  if (last < 1) return Math.max(0, last);
  const times = events.flat().filter((e) => MEANINGFUL.has(e.kind)).map((e) => e.t_s);
  if (!times.length) return last;
  const cut = Math.max(...times) * HORIZON_PAD;
  if (cut >= t[last]) return last;
  const i = t.findIndex((x) => x >= cut);
  return i < 0 ? last : i;
}
