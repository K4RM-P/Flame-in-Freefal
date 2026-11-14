// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
import { describe, expect, it } from "vitest";
import { CabinVolumeRequired, simulate } from "@/lib/sim/engine";
import { MATERIALS } from "@/lib/sim/params";
import { PRESETS } from "@/lib/sim/presets";
import { rankEvidence } from "@/lib/sim/evidence";
import { sensitivity } from "@/lib/sim/sensitivity";
import { nextTest } from "@/lib/sim/nextTest";
import { exportPsiRowsCsv, exportSeriesCsv } from "@/lib/sim/export";
import { replayError } from "@/lib/sim/replay";
import type { Scenario } from "@/lib/sim/types";

// Test-only cabin volume (m³) for presets whose volume has no sourced value (they ship with V = null).
const TEST_V = 20;
const mat = MATERIALS.find((m) => m.ignitable)!;
function base(over: Partial<Scenario["cabin"]> = {}): Scenario {
  return {
    name: "t", preset_id: null,
    cabin: { x_o2: 0.21, P_Pa: 101.3e3, gravity_g: 0, V_m3: TEST_V, flow_m_s: 0.2, fan_off_on_alarm: false, ...over },
    items: [{ id: "i", material_key: mat.material_key, thickness_m: 4e-4, length_m: 0.4, width_m: 0.5, ignite: true, t_ignite_s: 0 }],
    detection: { type: "photoelectric", distance_m: 1, threshold: null },
    suppression: { agent: "none", delay_s: 0, mass_kg: 0 }, t_end_s: 120,
  };
}
const flat = (s: Scenario) => (Object.assign(JSON.parse(JSON.stringify(s)), { cabin: { ...s.cabin, V_m3: s.cabin.V_m3 ?? TEST_V } }) as Scenario);

describe("cabin fire engine", () => {
  it("is deterministic (nominal and Monte Carlo)", () => {
    expect(JSON.stringify(simulate(base()))).toBe(JSON.stringify(simulate(base())));
    expect(JSON.stringify(simulate(base(), { mc: 20, seed: 7 }))).toBe(JSON.stringify(simulate(base(), { mc: 20, seed: 7 })));
  });
  it("zero heat release keeps the cabin steady", () => {
    const s = base(); s.items[0].ignite = false;
    const r = simulate(s);
    const s0 = r.state[0], s1 = r.state[r.state.length - 1];
    expect(r.state.every((x) => x.Q_W === 0)).toBe(true);
    expect(s1.T_K).toBeCloseTo(s0.T_K, 9);
    expect(s1.x_o2).toBeCloseTo(s0.x_o2, 12);
    expect(s1.P_Pa).toBeCloseTo(s0.P_Pa, 6);
  });
  it("higher O₂ spreads faster", () => {
    const lo = simulate(base({ x_o2: 0.21 })), hi = simulate(base({ x_o2: 0.3 }));
    const i = 20; // t = 10 s
    expect(hi.items[0].front_m[i]).toBeGreaterThan(lo.items[0].front_m[i]);
  });
  it("a CO₂ release lowers O₂", () => {
    const s = base(); s.items[0].ignite = false; s.detection.manual_alarm_s = 10;
    const none = simulate(s);
    s.suppression = { agent: "CO2", delay_s: 5, mass_kg: 2 };
    const co2 = simulate(s);
    expect(co2.events.some((e) => e.kind === "agent_released")).toBe(true);
    expect(co2.state[co2.state.length - 1].x_o2).toBeLessThan(none.state[none.state.length - 1].x_o2);
    expect(co2.state[co2.state.length - 1].x_co2).toBeGreaterThan(0);
  });
  it("requires a cabin volume", () => {
    expect(() => simulate(base({ V_m3: null }))).toThrow(CabinVolumeRequired);
  });
  it("every preset runs with no NaN (test volume supplied where the preset has none)", () => {
    for (const p of PRESETS) {
      const b = p.build();
      const list = "a" in b && "b" in b ? [b.a, b.b] : [b as Scenario];
      for (const s of list) {
        expect(s.items.length).toBeGreaterThan(0);
        const r = simulate(flat(s), { mc: 10 });
        for (const st of r.state) for (const v of Object.values(st)) expect(Number.isFinite(v)).toBe(true);
        for (const m of r.outcome.metrics) if (m.value !== null) expect(Number.isFinite(m.value)).toBe(true);
      }
    }
  });
  it("provenance: every limit-checked metric and every source has a source string", () => {
    const r = simulate(base());
    for (const m of r.outcome.metrics) if (m.limit !== undefined) expect(m.limit_source && m.limit_source.length > 3).toBe(true);
    expect(r.outcome.metrics.filter((m) => m.limit !== undefined).length).toBeGreaterThan(0);
    for (const s of r.provenance.sources) expect(s.source_id.length).toBeGreaterThan(0);
    for (const p of Object.values(r.provenance.params)) expect(p.source.length).toBeGreaterThan(0);
    for (const p of PRESETS) for (const [path, pv] of Object.entries(p.provenance)) expect(`${path}:${pv.source_id || pv.note || ""}`.length).toBeGreaterThan(path.length + 1);
  });
  it("evidence, sensitivity, next test and exports work on a preset", () => {
    const s = flat((PRESETS[1].build() as { b: Scenario }).b);
    const ev = rankEvidence(s);
    expect(ev.length).toBeGreaterThan(0);
    expect(ev[0].accession).toMatch(/^PSI-/);
    const rows = sensitivity(s, "peak_T");
    expect(rows.length).toBeGreaterThan(0);
    const nt = nextTest(s);
    expect(nt?.condition).toBeTruthy();
    const r = simulate(s);
    expect(exportSeriesCsv(r).split("\n").length).toBeGreaterThan(r.t.length);
    expect(exportPsiRowsCsv(s)).toContain("source_id,locator");
    const tel = { source_id: "x", locator: "x", t: r.t, T_K: r.state.map((x) => x.T_K), meta: {} };
    expect(replayError(r, tel)?.T_K?.rmse).toBeCloseTo(0, 9);
  });
});
