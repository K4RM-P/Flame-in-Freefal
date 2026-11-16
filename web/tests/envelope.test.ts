// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// U4: material envelope explorer data.
import { describe, expect, it } from "vitest";
import { breO2, coverage, materialBoxes, missionPoints, pointFromQuery } from "@/lib/evidence/envelope";
import materials from "@/data/materials.json";

describe("envelope explorer", () => {
  it("draws every burned PSI material at its tested O₂ range (from materials.json, unchanged)", () => {
    const boxes = materialBoxes();
    const burned = (materials as { material_key: string; has_burn_data: boolean; o2_range: [number, number] | null }[]).filter((m) => m.has_burn_data);
    expect(boxes.map((b) => b.key).sort()).toEqual(burned.map((m) => m.material_key).sort());
    for (const b of boxes) {
      const m = burned.find((x) => x.material_key === b.key)!;
      if (m.o2_range) expect(b.o2![1]).toBeCloseTo(m.o2_range[1] * 100, 9);
    }
  });
  it("the lunar habitat is outside every solid's tested range; ISS air is inside at least one", () => {
    const m = missionPoints();
    const lunar = m.find((x) => x.id === "LunarHabitat")!, iss = m.find((x) => x.id === "ISS")!;
    expect(coverage({ label: "L", x_o2: lunar.x_o2, P_kPa: lunar.P_kPa, flow_cm_s: lunar.flow_cm_s }).some((c) => c.inside)).toBe(false);
    expect(coverage({ label: "I", x_o2: iss.x_o2, P_kPa: iss.P_kPa, flow_cm_s: iss.flow_cm_s }).some((c) => c.inside)).toBe(true);
    const gap = coverage({ label: "L", x_o2: lunar.x_o2, P_kPa: lunar.P_kPa, flow_cm_s: lunar.flow_cm_s }).find((c) => c.key === "sibal")!.gap;
    expect(gap).toMatch(/O₂ .* points above the highest tested/);
  });
  it("ACME BRE is plotted by O₂ only (its chamber pressure is not identified)", () => {
    expect(breO2().map((b) => b.o2)).toContain(34);
  });
  it("parses the simulator link and rejects nonsense", () => {
    expect(pointFromQuery(new URLSearchParams("o2=34&p=56.5&u=5&mat=sibal"))).toMatchObject({ x_o2: 34, P_kPa: 56.5, flow_cm_s: 5, material: "sibal" });
    expect(pointFromQuery(new URLSearchParams("o2=340&p=56.5"))).toBeNull();
    expect(pointFromQuery(new URLSearchParams("p=56.5"))).toBeNull();
  });
});
