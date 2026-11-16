// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// U3: "what changed" diff after Apply & re-run; lever fixes can now be applied.
import { describe, expect, it } from "vitest";
import { designReview, metricOf } from "@/lib/sim/designReview";
import { inputChanges, runDiff } from "@/lib/sim/diff";
import { simulate } from "@/lib/sim/engine";
import { presetById } from "@/lib/sim/presets";
import type { Scenario } from "@/lib/sim/types";

const review = presetById("lunar-design-review")!.build() as Scenario;
const pair = presetById("iss-vs-lunar")!.build() as { a: Scenario; b: Scenario };

describe("run diff", () => {
  it("lists exactly the inputs that differ", () => {
    const c = inputChanges(pair.a, pair.b).map((x) => x.key);
    expect(c).toEqual(expect.arrayContaining(["x_o2", "P_Pa", "gravity_g"]));
    expect(c).not.toContain("mass");
    expect(inputChanges(pair.a, structuredClone(pair.a))).toEqual([]);
  });
  it("ISS → Lunar: longer fire is 'worse', values are the engine's", () => {
    const ra = simulate(pair.a), rb = simulate(pair.b);
    const d = runDiff(pair.a, ra, pair.b, rb);
    const te = d.outcomes.find((o) => o.key === "time_to_extinguish")!;
    expect(te.before).toBe(metricOf(ra, "time_to_extinguish"));
    expect(te.after).toBe(metricOf(rb, "time_to_extinguish"));
    expect(te.verdict).toBe("worse");
    expect(te.note).toBe("quenched → burned out");
    expect(d.outcomes.find((o) => o.key === "peak_Q")!.after).toBe(metricOf(rb, "peak_Q"));
    expect(d.outcomes.find((o) => o.key === "peak_co")!.theoryOnly).toBe(true);
  });
  it("Apply fix #1 on the unfixed Moon base: the diff names the change and reads both runs", () => {
    const r = simulate(review);
    const fixes = designReview(review, r);
    const f = fixes.find((x) => x.scenario)!;
    const rf = simulate(f.scenario!);
    const d = runDiff(review, r, f.scenario!, rf);
    expect(d.inputs.length).toBeGreaterThan(0);
    expect(d.outcomes.find((o) => o.key === "time_to_alarm")!.after).toBe(metricOf(rf, "time_to_alarm"));
  });
  it("sensitivity-lever fixes carry the edited scenario, so they can be applied", () => {
    const fixes = designReview(pair.b, simulate(pair.b));
    const levers = fixes.filter((f) => f.id.startsWith("lever-"));
    expect(levers.length).toBeGreaterThan(0);
    for (const l of levers) {
      expect(l.scenario).toBeDefined();
      // Re-running the attached scenario reproduces the 'after' value the review printed.
      expect(metricOf(simulate(l.scenario!), l.metric)).toBeCloseTo(l.after as number, 6);
    }
  });
});
