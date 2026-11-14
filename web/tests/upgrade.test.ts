// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Judge-audit acceptance: presets run in one click, evidence gated by material class, tolerant envelope, next test.
import { describe, expect, it } from "vitest";
import { envelopeWarnings, simulate } from "@/lib/sim/engine";
import { PRESETS, presetById } from "@/lib/sim/presets";
import { BRE_MIN_X_O2, earthVsOrbitSummary, evidenceStops, rankEvidence } from "@/lib/sim/evidence";
import { nextTest, outOfEnvelope } from "@/lib/sim/nextTest";
import { tolerantRange } from "@/lib/sim/params";
import type { Scenario } from "@/lib/sim/types";

const pair = () => presetById("iss-vs-lunar")!.build() as { a: Scenario; b: Scenario };

describe("presets run in one click", () => {
  it("no preset requires a detector threshold", () => {
    for (const p of PRESETS) expect(p.required.join(" ")).not.toMatch(/detection\.threshold/);
  });
  it("ISS vs Lunar and Lunar tune need zero user input and simulate without throwing", () => {
    for (const id of ["iss-vs-lunar", "lunar-tune"]) {
      const p = presetById(id)!;
      expect(p.required).toEqual([]);
      const b = p.build();
      for (const s of "a" in b ? [b.a, b.b] : [b]) { expect(s.cabin.V_m3).toBeGreaterThan(0); expect(() => simulate(s, { t_end_s: 30 } as never)).not.toThrow(); }
    }
  });
  it("ISS volume is cited and the lunar volume is a labelled design input held equal to A", () => {
    const p = presetById("iss-vs-lunar")!; const { a, b } = pair();
    expect(a.cabin.V_m3).toBe(b.cabin.V_m3);
    expect(p.provenance["cabin.V_m3"].source_id).toBe("nasa-iss-facts");
    expect(p.provenance["b.cabin.V_m3"]).toEqual({ source_id: "design input", note: "held equal to Scenario A for a like-for-like comparison" });
  });
  it("the Saffire replay keeps the Cygnus volume as its single required field", () => {
    const p = presetById("saffire-replay")!;
    expect(p.required).toEqual(["Saffire-III replay: cabin.V_m3"]);
    expect(p.provenance["cabin.V_m3"].note).toBe("Enter the Cygnus free volume (not stated in PSI-100)");
  });
});

describe("evidence ranking is gated by material class", () => {
  it("SIBAL in the Lunar Habitat: top 3 are solid-fuel investigations and PSI-20 is present", () => {
    const { b } = pair();
    const ev = rankEvidence(b);
    const top = ev.slice(0, 3).map((e) => e.accession);
    for (const acc of top) expect(["PSI-98", "PSI-99", "PSI-100", "PSI-25", "PSI-26"]).toContain(acc);
    expect(b.cabin.x_o2).toBeGreaterThanOrEqual(BRE_MIN_X_O2);
    const bre = ev.find((e) => e.accession === "PSI-20")!;
    expect(bre).toBeTruthy(); expect(bre.why).toMatch(/gas burner emulating solids/);
    const liquids = ev.filter((e) => ["PSI-69", "PSI-68", "PSI-39"].includes(e.accession));
    expect(liquids.length).toBeGreaterThan(0);
    for (const l of liquids) { expect(l.role).toEqual(["suppression"]); expect(ev.indexOf(l)).toBeGreaterThan(ev.findIndex((e) => e.accession === "PSI-20")); }
    for (const acc of ["PSI-102", "PSI-101", "PSI-47"]) expect(ev.find((e) => e.accession === acc)?.role).toEqual(["smoke"]);
  });
  it("PSI-20 is absent at ISS oxygen", () => {
    expect(rankEvidence(pair().a).some((e) => e.accession === "PSI-20")).toBe(false);
  });
  it("earth-vs-orbit counts and the evidence boundary are computed from data", () => {
    const evo = earthVsOrbitSummary();
    expect(evo.counts.n).toBe(evo.rows.length);
    expect(evo.counts.better + evo.counts.same + evo.counts.worse).toBe(evo.counts.n);
    const st = evidenceStops("LunarHabitat");
    expect(st.max_solid_x_o2).toBeLessThan(st.mission.x_o2);
    expect(st.rows.find((r) => r.material_key === "sibal")?.beyond.o2).toBe(true);
  });
});

describe("tolerant envelope and next test", () => {
  it("degenerate ranges get a tolerance", () => {
    expect(tolerantRange([101e3, 101e3], "P_Pa")).toEqual([95.95e3, 106.05e3]);
    expect(tolerantRange([0.21, 0.21], "x_o2")![0]).toBeCloseTo(0.2); const f = tolerantRange([0.2, 0.2], "flow_m_s")!; expect(f[0]).toBeCloseTo(0.16); expect(f[1]).toBeCloseTo(0.24);
  });
  it("the ISS preset gets no pressure warning and no next test", () => {
    const { a } = pair();
    expect(envelopeWarnings(a).filter((w) => /Pressure|O₂|flow/.test(w))).toEqual([]);
    expect(outOfEnvelope(a)).toEqual([]);
    expect(nextTest(a)).toBeNull();
  });
  it("the Lunar preset's next test is O₂ or pressure, phrased with real numbers", () => {
    const { b } = pair();
    const nt = nextTest(b)!;
    expect(["x_o2", "P_Pa"]).toContain(nt.param);
    expect(nt.why).toMatch(/\d+ points above the highest PSI test of SIBAL Fabric \(\d+%\)|kPa below the lowest/);
    expect(nt.why).not.toMatch(/changes the predicted outcome/);
    expect(outOfEnvelope(b).map((o) => o.param)).toEqual(expect.arrayContaining(["x_o2", "P_Pa", "gravity_g"]));
  });
});
