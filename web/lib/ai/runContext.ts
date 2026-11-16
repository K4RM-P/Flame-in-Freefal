// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Aster context for the simulator's latest run: every number is copied from the engine result (same formatter
// as the UI), so the numeric guard can check Aster's answer against the engine.
import type { AsterContext } from "@/lib/ai/asterContext";
import { withUnit } from "@/lib/ui/format";
import { outOfEnvelope } from "@/lib/sim/nextTest";
import type { Scenario, SimResult } from "@/lib/sim/types";

const show = (v: number | null, units: string) => (v === null ? "never" : withUnit(v, units, 3));

const REASON: Record<string, string> = {
  quench: "quench: the equivalent flow fell below the low-flow quench limit",
  inerting: "inerting: the cabin atmosphere could no longer support the flame",
  burnout: "burnout: the flame front reached the end of the item — fuel used up",
};

function describe(label: string, s: Scenario, r: SimResult): string {
  const m = (k: string) => r.outcome.metrics.find((x) => x.key === k)?.value ?? null;
  const reason = r.items.map((i) => i.extinguish_reason).find(Boolean);
  const peakQ = Math.max(0, ...r.state.map((x) => x.Q_W));
  const area = Math.max(0, ...r.state.map((x) => x.burning_area_m2));
  const g = s.cabin.gravity_g;
  const lines = [
    `${label} (${s.name}): O₂ ${show(s.cabin.x_o2 * 100, "%")}, pressure ${show(s.cabin.P_Pa / 1000, "kPa")}, gravity ${g === 0 ? "microgravity" : `${show(g, "g")}`}, flow ${show(s.cabin.flow_m_s * 100, "cm/s")}${s.cabin.fan_off_on_alarm ? ", fan off on alarm" : ""}.`,
    `Events: ${r.events.map((e) => `t = ${show(e.t_s, "s")} ${e.kind.replace("_", " ")}`).join("; ") || "none"}.`,
    `Fire out at ${show(m("time_to_extinguish"), "s")}${reason ? ` (${REASON[reason] ?? reason})` : " (still burning at the end of the run)"}. Peak heat release ${show(peakQ, "W")}; burnt area ${show(area, "m²")}.`,
  ];
  if (r.flags?.partial_g_nonconservative) lines.push("Partial gravity is an estimate between microgravity and 1 g, not measured, and may be non-conservative (NASA FM2, NTRS 20240015307).");
  if (outOfEnvelope(s).length) lines.push("EXTRAPOLATED: outside the tested PSI envelope (" + outOfEnvelope(s).map((o) => o.label).join(", ") + ").");
  return lines.join(" ");
}

/** null when nothing has been run yet. */
export function runContext(a: Scenario | null, ra: SimResult | null, b: Scenario | null, rb: SimResult | null): AsterContext | null {
  if (!a || !ra) return null;
  const parts = [describe(b && rb ? "Scenario A" : "Run", a, ra)];
  if (b && rb) parts.push(describe("Scenario B", b, rb));
  parts.push("Smoke and CO are theory-only (uncalibrated). Not for flight certification.");
  return { kind: "run", label: b && rb ? `Simulator run: ${a.name} vs ${b.name}` : `Simulator run: ${a.name}`, facts: parts.join("\n").slice(0, 6000), question: "Explain this run." };
}
