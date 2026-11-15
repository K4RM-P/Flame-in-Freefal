// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Deterministic run summary used when the AI interpretation is unavailable. Every number is copied from the engine
// result or the design review (same formatter), never computed here.
import { designReview, show } from "@/lib/sim/designReview";
import type { Scenario, SimResult } from "@/lib/sim/types";

export function localInterpret(s: Scenario, r: SimResult): string {
  const m = (k: string) => r.outcome.metrics.find((x) => x.key === k);
  const ev = (k: string) => r.events.find((e) => e.kind === k);
  const out: string[] = [];
  const te = m("time_to_extinguish")?.value ?? null;
  const reason = r.items.map((i) => i.extinguish_reason).find(Boolean);
  out.push(ev("alarm") ? `Alarm at ${show(ev("alarm")!.t_s, "s")}.` : "No alarm fired in this run.");
  if (ev("agent_released")) out.push(`Agent released at ${show(ev("agent_released")!.t_s, "s")}.`);
  else if (s.suppression.agent !== "none") out.push("The extinguisher never fired.");
  out.push(te !== null ? `Fire out at ${show(te, "s")}${reason ? ` (${reason})` : ""}.` : "The fire was still burning at the end of the run.");
  const f = designReview(s, r)[0];
  if (f) out.push(`Biggest fix: ${f.title} (${show(f.before, f.units)} → ${show(f.after, f.units)}; ${f.basis}).`);
  if (r.flags?.partial_g_nonconservative) out.push("Partial-gravity result: an estimate that may be non-conservative (NASA FM2).");
  out.push("CO and smoke values are theory-only.");
  return `Offline summary (deterministic, no AI): ${out.join(" ")}`;
}
