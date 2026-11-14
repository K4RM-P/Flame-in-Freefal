// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
import { describe, expect, it } from "vitest";
import { conditionDiff } from "@/lib/diff";
import { TEST_POINTS } from "@/lib/testPoints";

describe("conditionDiff (A3)", () => {
  const a = TEST_POINTS[0];
  it("reports nothing for identical conditions", () => {
    expect(conditionDiff(a, { ...a }).changes).toEqual([]);
  });
  it("flags a minimal pair when exactly one condition differs", () => {
    const d = conditionDiff(a, { ...a, x_o2: a.x_o2 + 0.05 });
    expect(d.minimalPair).toBe(true);
    expect(d.changes.map((c) => c.k)).toEqual(["x_o2"]);
  });
  it("treats values within the relative tolerance as equal and lists every other difference", () => {
    const d = conditionDiff(a, { ...a, pressure_kpa: a.pressure_kpa * 1.001, diluent: "CO2", flow_cm_s: 5 });
    expect(d.changes.map((c) => c.k).sort()).toEqual(["diluent", "flow_cm_s"]);
    expect(d.minimalPair).toBe(false);
  });
});
