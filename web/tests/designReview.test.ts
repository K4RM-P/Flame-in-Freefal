// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Firefighter story (presets), the deterministic design review and theory-only labelling.
import { describe, expect, it } from "vitest";
import { simulate } from "@/lib/sim/engine";
import { PRESETS, presetById } from "@/lib/sim/presets";
import { designReview, rankFixes, show, type DesignFix } from "@/lib/sim/designReview";
import { exportSeriesCsv } from "@/lib/sim/export";
import { buildFacts, INSTRUCTIONS } from "@/lib/ai/interpret";
import { PARTIAL_G_CAVEAT } from "@/lib/sim/wording";
import type { Scenario } from "@/lib/sim/types";

const pair = () => presetById("iss-vs-lunar")!.build() as { a: Scenario; b: Scenario };
const review = () => presetById("lunar-design-review")!.build() as Scenario;
const kinds = (s: Scenario) => simulate(s).events.map((e) => e.kind).filter((k) => k !== "ignition" && k !== "limit_exceeded");
const firstAt = (s: Scenario, k: string) => simulate(s).events.find((e) => e.kind === k)?.t_s ?? null;

describe("firefighter story: iss-vs-lunar", () => {
  for (const side of ["a", "b"] as const) {
    it(`cabin ${side.toUpperCase()}: alarm → fan_off → agent_released, and the fire goes out`, () => {
      const s = pair()[side];
      const k = kinds(s);
      for (const e of ["alarm", "fan_off", "agent_released", "extinguished"]) expect(k).toContain(e);
      expect(firstAt(s, "alarm")!).toBeLessThanOrEqual(firstAt(s, "fan_off")!);
      expect(firstAt(s, "fan_off")!).toBeLessThan(firstAt(s, "agent_released")!);
    });
  }
  it("records the real order: ISS quenches at fan-off (before the agent); the Moon cabin outlasts the agent", () => {
    const { a, b } = pair();
    expect(firstAt(a, "extinguished")!).toBeLessThan(firstAt(a, "agent_released")!);
    expect(kinds(b)).toEqual(["alarm", "fan_off", "agent_released", "extinguished"]);
    const ra = simulate(a), rb = simulate(b);
    const te = (r: typeof ra) => r.outcome.metrics.find((m) => m.key === "time_to_extinguish")!.value!;
    expect(te(rb)).toBeGreaterThan(te(ra));
    expect(rb.items[0].extinguish_reason).toBe("burnout");
  });
  it("lunar-design-review never releases the agent", () => {
    expect(kinds(review())).not.toContain("agent_released");
    expect(review().suppression.agent).not.toBe("none");
  });
  it("every design input carries source_id 'design input'", () => {
    for (const p of PRESETS) {
      p.build();
      for (const [k, v] of Object.entries(p.provenance)) {
        if (/suppression|manual_alarm_s|fan_off_on_alarm|distance_m|t_ignite_s/.test(k) && p.id !== "saffire-replay") expect(v.source_id, `${p.id}:${k}`).toBe("design input");
      }
    }
    const prov = presetById("iss-vs-lunar")!.provenance;
    for (const k of ["detection.manual_alarm_s", "b.detection.manual_alarm_s", "suppression.agent", "b.suppression.mass_kg", "b.cabin.fan_off_on_alarm"]) expect(prov[k]?.source_id, k).toBe("design input");
  });
});

describe("design review", () => {
  it("lunar-design-review: fix #1 is the alarm / extinguisher fix", () => {
    const s = review();
    const f = designReview(s, simulate(s));
    expect(f[0].id).toBe("alarm-path");
    expect(f[0].detail).toMatch(/never fires/);
  });
  it("a theory-only fix never outranks a calibrated or rule-based one", () => {
    for (const s of [review(), pair().a, pair().b]) {
      const f = designReview(s, simulate(s));
      const firstTheory = f.findIndex((x) => x.basis === "theory-only");
      if (firstTheory >= 0) expect(f.slice(firstTheory).every((x) => x.basis === "theory-only")).toBe(true);
    }
    // Even with a far larger effect, a theory-only fix ranks below calibrated and rule-based fixes.
    const mk = (id: string, basis: DesignFix["basis"], effect: number): DesignFix => ({ id, title: id, detail: "", metric: "m", before: 1, after: 0, units: "", effect, basis, inEnvelope: true, sources: [] });
    const ranked = rankFixes([mk("lever-co", "theory-only", 50), mk("lever-o2", "calibrated", 0.1), mk("rule", "design-input", 0)]);
    expect(ranked.map((x) => x.id)).toEqual(["rule", "lever-o2", "lever-co"]);
  });
  it("numbers in detail are the engine's numbers", () => {
    const s = review();
    const r = simulate(s);
    const te = r.outcome.metrics.find((m) => m.key === "time_to_extinguish")!.value;
    const f = designReview(s, r);
    expect(f[0].detail).toContain(show(te, "s"));
    const fixed: Scenario = JSON.parse(JSON.stringify(s)); fixed.detection.manual_alarm_s = 30;
    const rf = simulate(fixed);
    expect(f[0].after).toBe(rf.events.find((e) => e.kind === "agent_released")!.t_s);
    expect(f[0].detail).toContain(show(f[0].after, "s"));
    for (const x of f) if (x.id.startsWith("lever-")) expect(x.detail).toContain(`${show(x.before, x.units)} → ${show(x.after, x.units)}`);
  });
  it("never proposes O₂ below the crew ppO₂ floor", () => {
    const s = pair().b;
    for (const x of designReview(s, simulate(s))) if (x.id === "lever-x_o2") expect(Number(x.title.match(/[\d.]+/)![0]) / 100 * s.cabin.P_Pa).toBeGreaterThanOrEqual(16500 * 0.999);
  });
  it("flows into the AI facts and instructions", () => {
    const s = review(); const r = simulate(s);
    const facts = buildFacts({ scenario: s as unknown as Record<string, unknown>, result: { outcome: r.outcome as unknown as Record<string, unknown>, events: [], warnings: r.warnings }, evidence: [] });
    expect((facts.design_review as { id: string }[])[0].id).toBe("alarm-path");
    expect(INSTRUCTIONS).toMatch(/fix #1/);
    expect(INSTRUCTIONS).toMatch(/FM2/);
  });
});

describe("science wording and theory-only flags", () => {
  it("partial gravity carries the FM2 non-conservative caveat and flag", () => {
    const r = simulate(pair().b);
    expect(r.warnings.some((w) => w.includes(PARTIAL_G_CAVEAT))).toBe(true);
    expect(r.flags?.partial_g_nonconservative).toBe(true);
    expect(simulate(pair().a).flags?.partial_g_nonconservative).toBe(false);
    expect(r.warnings.join(" ")).not.toMatch(/bounded estimate \(µg ↔ 1 g\)/);
  });
  it("CO and smoke numbers carry the theory-only flag (metrics, CSV headers)", () => {
    const r = simulate(pair().b);
    const co = r.outcome.metrics.find((m) => m.key === "peak_co")!;
    expect(co.theory_only).toBe(true);
    expect(co.label).toMatch(/theory-only/);
    const head = exportSeriesCsv(r).split("\n")[1].split(",");
    expect(head.filter((h) => /^(x_co|smoke_det)\b/.test(h) && !h.startsWith("x_co2")).every((h) => h.includes("(theory-only)"))).toBe(true);
    const s = review();
    for (const f of designReview(s, simulate(s))) if (f.metric === "peak_co") expect(f.basis).toBe("theory-only");
  });
});
