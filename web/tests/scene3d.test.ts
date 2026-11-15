// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// frame.ts is the only engine → 3D bridge; these guard the "no fake data" mapping rules.
import { describe, expect, it } from "vitest";
import { shapeFactor, visualState } from "@/components/sim/scene3d/frame";
import type { Scenario, SimResult, CabinState } from "@/lib/sim/types";

const sc = (g = 0, agent: "none" | "CO2" = "CO2"): Scenario => ({
  name: "test", preset_id: null, t_end_s: 10,
  cabin: { x_o2: 0.21, P_Pa: 101325, gravity_g: g, V_m3: 10, flow_m_s: 0.1, fan_off_on_alarm: true },
  items: [{ id: "i1", material_key: "sibal", thickness_m: 0.0003, length_m: 0.5, width_m: 0.1, ignite: true, t_ignite_s: 0 }],
  detection: { type: "photoelectric", distance_m: 1, threshold: 1e-6, manual_alarm_s: null },
  suppression: { agent, delay_s: 1, mass_kg: 1 },
});

function result({ smoke = true }: { smoke?: boolean } = {}): SimResult {
  const t = Array.from({ length: 11 }, (_, i) => i);
  const status = t.map((x) => (x < 1 ? "idle" : x < 7 ? "burning" : "out")) as ("idle" | "burning" | "out")[];
  const state: CabinState[] = t.map((x) => ({ T_K: 295 + x, P_Pa: 101325, x_o2: 0.21 - x * 0.001, p_o2_Pa: 0, y_o2: 0, x_co2: 0, x_co: 1e-6 * x,
    smoke_det: smoke ? 1e-7 * x : 0, Q_W: status[x] === "burning" ? 100 * x : 0, burning_area_m2: status[x] === "burning" ? 0.01 : 0 }));
  return {
    t, state, events: [
      { t_s: 1, kind: "ignition", item_id: "i1", detail: "" }, { t_s: 4, kind: "alarm", detail: "" }, { t_s: 4, kind: "fan_off", detail: "" },
      { t_s: 5, kind: "agent_released", detail: "" }, { t_s: 7, kind: "extinguished", item_id: "i1", detail: "" },
    ],
    items: [{ id: "i1", status, front_m: t.map((x) => Math.min(0.5, x * 0.05)), burning_area_m2: state.map((s) => s.burning_area_m2), extinguish_reason: "inerting" }],
    warnings: smoke ? [] : ["No sourced smoke yield for sibal"], outcome: { metrics: [] },
    provenance: { sources: [], params: { spread: { calibrated: true, source: "x" }, smoke: { calibrated: false, source: "x" } }, seed: 1, engine_version: "t" },
  };
}

describe("scene3d frame → VisualState", () => {
  it("flame present iff the item is burning", () => {
    const r = result();
    for (let f = 0; f < r.t.length; f++) {
      const v = visualState(sc(), r, f);
      expect(v.items[0].flamePresent).toBe(r.items[0].status[f] === "burning");
    }
    expect(visualState(sc(), null, 0).items[0].flamePresent).toBe(false);
  });
  it("smoke is 0 with a no-data chip when there is no smoke yield", () => {
    const r = result({ smoke: false });
    for (let f = 0; f < r.t.length; f++) { const v = visualState(sc(), r, f); expect(v.smoke).toBe(0); expect(v.smokeNoData).toBe(true); }
    expect(visualState(sc(), result(), 6).smoke).toBeGreaterThan(0);
  });
  it("alarm flag only at or after the alarm event", () => {
    const r = result();
    for (let f = 0; f < r.t.length; f++) expect(visualState(sc(), r, f).alarm).toBe(r.t[f] >= 4);
    expect(visualState(sc(), r, 3.5).alarm).toBe(false);
  });
  it("µg shape factor is below the 1 g shape factor; partial g is between", () => {
    expect(shapeFactor(0)).toBeLessThan(shapeFactor(1));
    expect(visualState(sc(0), result(), 3).shape).toBeLessThan(visualState(sc(1), result(), 3).shape);
    const m = visualState(sc(0.165), result(), 3);
    expect(m.gravityMode).toBe("partial");
    expect(m.shape).toBeGreaterThan(0); expect(m.shape).toBeLessThan(1);
  });
  it("fan-off zeroes the lean; agent burst only after release; no smoulder unless burnout", () => {
    const r = result();
    expect(visualState(sc(), r, 3).lean).toBeGreaterThan(0);
    expect(visualState(sc(), r, 4).lean).toBe(0);
    expect(visualState(sc(), r, 4.9).agent).toBeNull();
    expect(visualState(sc(), r, 5.5).agent?.kind).toBe("CO2");
    expect(visualState(sc(0, "none"), r, 5.5).agent).toBeNull();
    expect(visualState(sc(), r, 7).items[0].smoulder).toBe(0);
    expect(visualState(sc(), r, 7).items[0].collapse).toBeGreaterThan(0);
  });
  it("interpolates between frames for smooth playback and clamps out-of-range indices", () => {
    const r = result();
    const v = visualState(sc(), r, 2.5);
    expect(v.t).toBeCloseTo(2.5);
    expect(v.hud.T_K).toBeCloseTo(297.5);
    expect(visualState(sc(), r, 999).frame).toBe(10);
    expect(visualState(sc(), r, -4).frame).toBe(0);
  });
});

import { flamePhys } from "@/components/sim/scene3d/frame";
describe("flame-shape physics (visual only)", () => {
  it("Heskestad length grows with Q, is 0 in µg, and is longer at partial g", () => {
    expect(flamePhys(5000, 0.01, 0.1, 0, 1).length_m).toBeGreaterThan(flamePhys(500, 0.01, 0.1, 0, 1).length_m);
    expect(flamePhys(5000, 0.01, 0.1, 0, 0).length_m).toBe(0);
    expect(flamePhys(5000, 0.01, 0.1, 0, 0.165).length_m).toBeGreaterThan(flamePhys(5000, 0.01, 0.1, 0, 1).length_m);
  });
  it("tilt is full in µg with flow, 0 in still air; sheath thickens as flow drops; puffing slows with size", () => {
    expect(flamePhys(1000, 0.01, 0.2, 0, 0).tilt).toBe(1);
    expect(flamePhys(1000, 0.01, 0, 0, 1).tilt).toBe(0);
    expect(flamePhys(1000, 0.01, 0.02, 0, 0).sheath_m).toBeGreaterThan(flamePhys(1000, 0.01, 0.3, 0, 0).sheath_m);
    expect(flamePhys(1000, 0.04, 0.1, 0, 1).flicker_Hz).toBeLessThan(flamePhys(1000, 0.01, 0.1, 0, 1).flicker_Hz);
    expect(flamePhys(1000, 0.01, 0.1, 0, 0).flicker_Hz).toBe(0);
  });
});
