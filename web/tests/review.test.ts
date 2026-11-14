import { describe, expect, it } from "vitest";
import { buildReview, type ReviewMission } from "@/lib/review";
import type { Material, ReviewData, TestPoint } from "@/lib/contracts";

// Test-only fixtures. Never shown in the UI.
const LUNAR: ReviewMission = { id: "LunarHabitat", name: "Lunar Habitat", x_o2: 0.34, P_kPa: 56.5, gravity_g: 0.165, flow_cm_s: 5 };
const UG: ReviewMission = { ...LUNAR, id: "ug", gravity_g: 0 };
const mat = (o: Partial<Material> = {}): Material => ({
  material_key: "fab", display_name: "Fixture fabric", class: "fabric", forms: ["sheet"], investigations: ["FIX"], n_tests: 3,
  o2_range_tested: [0.2, 0.4], p_range_kpa: [50, 110], flow_range_cm_s: [0, 30], gravity_levels_tested: [0],
  has_burn_data: true, has_smoke_data: false, has_1g_comparison: false, ...o,
});
let n = 0;
const tp = (x_o2: number, outcome: string, o: Partial<TestPoint> = {}): TestPoint => ({
  id: `T${n++}`, investigation_id: "FIX", x_o2, pressure_kpa: 101, flow_cm_s: 10, gravity_g: 0, outcome, source_id: "PSI-0",
  locator: "fixture", verified: true, material_key: "fab", spread_rate_mm_s: outcome === "burn" ? 2 : null, ...o,
});
const data = (pts: TestPoint[], m: Material[] | null = [mat()]): ReviewData => ({
  investigations: { FIX: { name: "Fixture", accession: "PSI-0" } }, testPoints: pts, materials: m, earthVsOrbit: null, evidenceIndex: null, boundary: null,
});

describe("buildReview verdict rules", () => {
  it("pending when materials.json has not landed", () => {
    const r = buildReview("fab", LUNAR, data([], null));
    expect(r.verdict.kind).toBe("pending");
    expect(r.q1.state).toBe("pending");
    expect(r.evidence).toEqual([]);
  });
  it("likely when it burned in orbit at x_O2 ≤ mission", () => {
    const r = buildReview("fab", LUNAR, data([tp(0.21, "burn"), tp(0.4, "extinct")]));
    expect(r.verdict.kind).toBe("likely");
    expect(r.verdict.sentence).toContain("PSI-0");
    expect(r.receipts.q1.rows.length).toBe(1);
  });
  it("acceptable only at µg, inside envelope, all ≥ mission tests non-burning", () => {
    const r = buildReview("fab", UG, data([tp(0.35, "extinct"), tp(0.4, "insignificant")]));
    expect(r.verdict.kind).toBe("acceptable");
  });
  it("partial gravity never upgrades to acceptable", () => {
    const r = buildReview("fab", LUNAR, data([tp(0.35, "extinct"), tp(0.4, "insignificant")]));
    expect(r.verdict.kind).toBe("marginal");
    expect(r.verdict.reasons.join(" ")).toMatch(/never upgrades/);
  });
  it("marginal outside the tested envelope", () => {
    const r = buildReview("fab", UG, data([tp(0.35, "extinct")], [mat({ p_range_kpa: [90, 110] })]));
    expect(r.verdict.kind).toBe("marginal");
  });
  it("marginal when only tests above mission O2 burned", () => {
    const r = buildReview("fab", UG, data([tp(0.36, "burn"), tp(0.4, "extinct")]));
    expect(r.verdict.kind).toBe("marginal");
  });
  it("no orbit burn data for smoke-only materials", () => {
    const r = buildReview("fab", LUNAR, data([], [mat({ has_burn_data: false, has_smoke_data: true })]));
    expect(r.verdict.kind).toBe("no_burn_data");
    expect(r.q1.state).toBe("nodata");
  });
  it("ignores unverified and 1 g rows", () => {
    const r = buildReview("fab", LUNAR, data([tp(0.21, "burn", { verified: false }), tp(0.21, "burn", { gravity_g: 1 })]));
    expect(r.verdict.kind).toBe("no_burn_data");
  });
  it("every displayed answer number has a receipt", () => {
    const r = buildReview("fab", LUNAR, data([tp(0.21, "burn"), tp(0.3, "burn", { spread_rate_mm_s: 4 })]));
    for (const q of [r.q1, r.q2, r.q3]) if (/\d/.test(q.big) && q.state === "ok") expect(q.receipt && r.receipts[q.receipt]).toBeTruthy();
  });
});
