// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// AI layer without network: numeric guard, citation guard, draft → SI scenario, route validation and no-key behaviour.
import { afterEach, describe, expect, it, vi } from "vitest";
import { guard, numbersIn, stripUnsupported, supported } from "@/lib/ai/guard";
import { buildFacts, checkAnswer, citationCheck, interpret, InterpretRequestSchema, stripAnswer } from "@/lib/ai/interpret";
import { draftToScenario, type Draft } from "@/lib/ai/scenario";
import { take } from "@/lib/ai/http";
import { DEFAULT_MODEL, model } from "@/lib/ai/client";
import { POST as interpretPOST } from "@/app/api/interpret/route";
import { POST as scenarioPOST } from "@/app/api/scenario/route";

describe("guard", () => {
  it("extracts numbers but ignores ids", () => {
    expect(numbersIn("K is 0.54 mm²/s per V5, PSI-99 and FLEX-136")).toEqual([0.54]);
  });
  it("accepts rounding and unit scalings, rejects invented numbers", () => {
    const pool = [0.19724, 56.5, 24.218];
    expect(supported(0.197, pool)).toBe(true);
    expect(supported(19.7, pool)).toBe(true);
    expect(supported(8.19, pool)).toBe(true);
    expect(supported(0.31, pool)).toBe(false);
  });
  it("flags and strips unsupported sentences", () => {
    const outs = [{ value: 4.58 }];
    expect(guard("Spread is 4.58 mm/s. It doubles to 9.9 mm/s on the Moon.", outs).ok).toBe(false);
    expect(stripUnsupported("Spread is 4.58 mm/s. It doubles to 9.9 mm/s on the Moon.", outs)).toBe("Spread is 4.58 mm/s. (removed unsupported claim)");
  });
});

const REQ = {
  scenario: { name: "t", cabin: { x_o2: 0.21 } },
  result: { outcome: { metrics: [{ key: "peak_T", value: 341.7, units: "K" }] }, events: [{ t_s: 48.5, kind: "alarm" }], warnings: ["spread: theory-only"] },
  evidence: [{ accession: "PSI-99", title: "SAFFIRE-II", role: "spread" }, { accession: "PSI-100", title: "SAFFIRE-III", role: "cabin" }],
};

describe("interpretation guard", () => {
  const facts = buildFacts(InterpretRequestSchema.parse(REQ));
  it("only accepts PSI ids from the evidence", () => {
    expect(citationCheck("Backed by PSI-99 and PSI-25.", facts.evidence)).toEqual({ citations: ["PSI-99"], unknown: ["PSI-25"] });
  });
  it("accepts engine numbers, rejects invented ones", () => {
    expect(checkAnswer("The alarm sounded at 48.5 s and peak temperature reached 341.7 K (PSI-100).", facts).ok).toBe(true);
    expect(checkAnswer("Peak temperature reached 410 K.", facts).ok).toBe(false);
  });
  it("strips sentences with unknown PSI ids", () => {
    expect(stripAnswer("Alarm at 48.5 s. PSI-25 shows the same.", facts)).toBe("Alarm at 48.5 s. (removed unsupported claim)");
  });
  it("regenerates once, then strips", async () => {
    const texts = ["Peak was 999 K.", "Peak was 999 K. Alarm at 48.5 s per PSI-99."];
    const client = { responses: { create: vi.fn(async () => ({ output_text: texts.shift() })) } };
    const r = await interpret(client as never, InterpretRequestSchema.parse(REQ));
    expect(client.responses.create).toHaveBeenCalledTimes(2);
    expect(r.guard).toMatchObject({ regenerated: true, stripped: true });
    expect(r.text).not.toContain("999");
    expect(r.citations).toEqual(["PSI-99"]);
  });
});

describe("scenario draft", () => {
  const lib = [{ material_key: "sibal", display_name: "SIBAL fabric", has_burn_data: true }, { material_key: "kapton", display_name: "Kapton", has_burn_data: false }];
  const draft: Draft = {
    name: "Lunar", notes: [],
    cabin: { o2_percent: 34, pressure_kPa: 56.5, gravity: "moon", volume_m3: null, flow_cm_s: 10, fan_off_on_alarm: true },
    items: [
      { material_key: "sibal", requested_material: "SIBAL", thickness_mm: 0.25, length_cm: 40, width_cm: 10, ignite: true, t_ignite_s: null },
      { material_key: "kapton", requested_material: "Kapton tape", thickness_mm: null, length_cm: null, width_cm: null, ignite: true, t_ignite_s: null },
      { material_key: null, requested_material: "pine wood", thickness_mm: 5, length_cm: 10, width_cm: 10, ignite: false, t_ignite_s: null },
    ],
    detection: { type: "photoelectric", distance_m: 1.5, threshold_mg_m3: null },
    suppression: { agent: "CO2", delay_s: 30, mass_kg: null },
    t_end_s: null,
  };
  const r = draftToScenario(draft, lib);
  it("converts to SI", () => {
    const c = r.scenario.cabin as Record<string, number>;
    expect(c.x_o2).toBeCloseTo(0.34); expect(c.P_Pa).toBeCloseTo(56500); expect(c.gravity_g).toBe(0.165); expect(c.flow_m_s).toBeCloseTo(0.1);
  });
  it("rejects out-of-library materials with the available list", () => {
    expect(r.rejected).toHaveLength(1);
    expect(r.rejected[0].reason).toContain("sibal, kapton");
  });
  it("smoke-only materials cannot ignite", () => {
    expect((r.scenario.items as { material_key: string; ignite: boolean }[]).find((i) => i.material_key === "kapton")?.ignite).toBe(false);
  });
  it("leaves unstated values null and reports them", () => {
    expect(r.missing).toContain("cabin.V_m3");
    expect(r.missing).toContain("detection.threshold");
    expect(r.valid).toBe(false);
  });
});

describe("routes", () => {
  afterEach(() => vi.unstubAllEnvs());
  const post = (body: unknown, ip: string) => new Request("http://x/api", { method: "POST", headers: { "x-forwarded-for": ip }, body: JSON.stringify(body) });
  it("no key → 503 with the instruction, never a canned answer", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    const r = await interpretPOST(post(REQ, "10.0.0.1"));
    expect(r.status).toBe(503);
    expect(await r.json()).toEqual({ error: "Add OPENAI_API_KEY to enable interpretation" });
    const sr = await scenarioPOST(post({ text: "ISS cabin with SIBAL" }, "10.0.0.1")); expect(sr.status).toBe(200); expect((await sr.json()).offline).toBe(true); // offline: rule-based parser, flagged
  });
  it("validates bodies before touching the provider", async () => {
    expect((await interpretPOST(post({ evidence: [{ accession: "X", title: "y" }] }, "10.0.0.2"))).status).toBe(400);
    expect((await scenarioPOST(post({ text: "" }, "10.0.0.2"))).status).toBe(400);
  });
  it("rate limits per IP", () => {
    const now = 1e12;
    const results = Array.from({ length: 10 }, () => take("10.9.9.9", now));
    expect(results.filter(Boolean)).toHaveLength(8);
    expect(take("10.9.9.8", now)).toBe(true);
  });
  it("model defaults and env override", () => {
    vi.stubEnv("OPENAI_MODEL", "");
    expect(model()).toBe(DEFAULT_MODEL);
    vi.stubEnv("OPENAI_MODEL", "gpt-5.5");
    expect(model()).toBe("gpt-5.5");
  });
});
