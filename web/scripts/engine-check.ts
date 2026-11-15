// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Engine check for the demo presets: events, outcome metrics, warnings and the top-5 design fixes.
// Run: pnpm -C web exec tsx scripts/engine-check.ts
import { presetById } from "@/lib/sim/presets";
import { simulate } from "@/lib/sim/engine";
import { designReview, metricOf, show } from "@/lib/sim/designReview";
import type { Scenario } from "@/lib/sim/types";

function report(label: string, s: Scenario) {
  const r = simulate(s);
  console.log(`\n=== ${label} (${s.name}) ===`);
  console.log("events:");
  for (const e of r.events) console.log(`  t=${e.t_s} s  ${e.kind}${e.item_id ? ` [${e.item_id}]` : ""}: ${e.detail}`);
  console.log("outcome:");
  for (const m of r.outcome.metrics) console.log(`  ${m.key} = ${m.value === null ? "null" : m.value.toPrecision(4)} ${m.units}`);
  console.log(`  peak_Q = ${metricOf(r, "peak_Q")!.toPrecision(4)} W; burnt area = ${Math.max(...r.state.map((x) => x.burning_area_m2)).toPrecision(4)} m²; flags = ${JSON.stringify(r.flags)}`);
  console.log("warnings:");
  for (const w of r.warnings) console.log(`  - ${w}`);
  console.log("design review (top 5):");
  designReview(s, r).slice(0, 5).forEach((f, i) => console.log(`  ${i + 1}. [${f.basis}${f.inEnvelope ? "" : ", outside envelope"}] ${f.title}: ${f.metric} ${show(f.before, f.units)} → ${show(f.after, f.units)}\n     ${f.detail}`));
}
const pair = presetById("iss-vs-lunar")!.build() as { a: Scenario; b: Scenario };
report("iss-vs-lunar A", pair.a);
report("iss-vs-lunar B", pair.b);
report("lunar-design-review", presetById("lunar-design-review")!.build() as Scenario);
