// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Must-fix items from docs/AUDIT.md: input guard, end-reason wording, claims on the landing page.
import { describe, expect, it } from "vitest";
import { InvalidScenario, simulate } from "@/lib/sim/engine";
import { durationVerdict, fireEnd, quenchLimit } from "@/lib/sim/endReason";
import { presetById } from "@/lib/sim/presets";
import { landingFacts } from "@/lib/landing/facts";
import type { Scenario } from "@/lib/sim/types";
import summary from "@/data/validation/summary.json";

const pair = () => presetById("iss-vs-lunar")!.build() as { a: Scenario; b: Scenario };

describe("engine input guard", () => {
  it.each([
    ["thickness 0", (s: Scenario) => { s.items[0].thickness_m = 0; }],
    ["negative flow", (s: Scenario) => { s.cabin.flow_m_s = -0.1; }],
    ["O₂ above 1", (s: Scenario) => { s.cabin.x_o2 = 1.2; }],
    ["NaN pressure", (s: Scenario) => { s.cabin.P_Pa = Number.NaN; }],
    ["gravity above 1 g", (s: Scenario) => { s.cabin.gravity_g = 3; }],
  ])("rejects %s with a readable error instead of NaN output", (_l, mutate) => {
    const s = structuredClone(pair().b);
    mutate(s);
    expect(() => simulate(s)).toThrow(InvalidScenario);
  });
  it("still runs an empty cabin (the no-fire card relies on it)", () => {
    const s = structuredClone(pair().a);
    s.items = [];
    expect(fireEnd(simulate(s)).kind).toBe("no-fire");
  });
});

describe("why each fire ended", () => {
  it("ISS vs Lunar: ISS is quenched after the fan stops, the lunar fire burns out; ratio is from the engine", () => {
    const { a, b } = pair();
    const ra = simulate(a), rb = simulate(b);
    const v = durationVerdict(a.name, ra, b.name, rb);
    expect(v.ea.kind).toBe("quench");
    expect(v.eb.kind).toBe("burnout");
    expect(v.longer).toBe(b.name);
    const ta = ra.outcome.metrics.find((m) => m.key === "time_to_extinguish")!.value!;
    const tb = rb.outcome.metrics.find((m) => m.key === "time_to_extinguish")!.value!;
    expect(v.ratio).toBeCloseTo(tb / ta, 10);
  });
  it("the quench phrase names the sourced limit and its verification status", () => {
    const q = quenchLimit();
    const { a } = pair();
    const e = fireEnd(simulate(a));
    expect(e.phrase).toContain(`${q.cm_s} cm/s`);
    expect(e.phrase).toContain(q.source);
    if (q.status === "TODO_VERIFY") expect(e.phrase).toContain("TODO_VERIFY");
  });
});

describe("landing claims", () => {
  it("validation tally separates pass, fail and pending", () => {
    const t = (summary as { targets: { status: string }[] }).targets;
    const pass = t.filter((x) => x.status === "pass").length, fail = t.filter((x) => x.status === "fail").length;
    expect(pass + fail).toBeLessThan(t.length); // some targets are pending data, so "x of total pass" would mislead
  });
  it("demo run facts carry the end reason, not 'faster/slower'", () => {
    const r = landingFacts().run!;
    expect(r.endA).toBe("quenched");
    expect(r.endB).toBe("burned out");
    expect(r.longer).toBe(r.bName);
  });
});
