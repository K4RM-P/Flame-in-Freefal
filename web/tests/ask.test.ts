// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Simulation assistant without network: fact-path citations, PSI-id and numeric guard, strip fallback, no-key route.
import { afterEach, describe, expect, it, vi } from "vitest";
import { AskRequestSchema, ask, askFacts, checkAsk, resolvePath, stripAsk } from "@/lib/ai/ask";
import { POST as askPOST } from "@/app/api/ask/route";

const REQ = {
  question: "Why did the fire continue?",
  scenario: { name: "t", cabin: { x_o2: 0.21, flow_m_s: 0.2 } },
  result: { outcome: { metrics: [{ key: "peak_T", value: 341.7, units: "K" }] }, events: [{ t_s: 48.5, kind: "alarm", detail: "detector threshold crossed" }], warnings: ["spread: theory-only"] },
  evidence: [{ accession: "PSI-99", title: "SAFFIRE-II", role: "spread" }],
  replay: { T_K: { rmse: 1.9 } },
};

describe("assistant guard", () => {
  const facts = askFacts(AskRequestSchema.parse(REQ));
  it("resolves [S:path] citations only to paths present in the facts", () => {
    expect(resolvePath(facts, "outcome.metrics[0].value")).toBe(true);
    expect(resolvePath(facts, "scenario.cabin.flow_m_s")).toBe(true);
    expect(resolvePath(facts, "replay_vs_telemetry.T_K.rmse")).toBe(true);
    expect(resolvePath(facts, "outcome.metrics[3].value")).toBe(false);
    expect(resolvePath(facts, "scenario.detection.threshold")).toBe(false);
  });
  it("accepts grounded answers, rejects invented numbers, ids and paths", () => {
    const ok = checkAsk("The alarm fired at 48.5 s [S:events.0.t_s]; spread is theory-only [S:warnings.0] (PSI-99).", facts, REQ.question);
    expect(ok).toMatchObject({ ok: true, citations: ["PSI-99"], facts: ["events.0.t_s", "warnings.0"] });
    expect(checkAsk("Peak was 410 K.", facts, REQ.question).ok).toBe(false);
    expect(checkAsk("See PSI-25.", facts, REQ.question).unknown_ids).toEqual(["PSI-25"]);
    expect(checkAsk("Threshold [S:scenario.detection.threshold].", facts, REQ.question).bad_refs).toEqual(["scenario.detection.threshold"]);
  });
  it("strips unsupported sentences and says so", () => {
    expect(stripAsk("Alarm at 48.5 s [S:events.0.t_s]. Peak was 999 K.", facts, REQ.question)).toBe("Alarm at 48.5 s [S:events.0.t_s]. (removed unsupported claim)");
  });
  it("regenerates once, then strips; never returns the invented value", async () => {
    const texts = ["Peak was 999 K.", "Peak was 999 K. Alarm at 48.5 s [S:events.0.t_s]."];
    const client = { responses: { create: vi.fn(async () => ({ output_text: texts.shift() })) } };
    const r = await ask(client as never, AskRequestSchema.parse(REQ));
    expect(client.responses.create).toHaveBeenCalledTimes(2);
    expect(r.guard).toMatchObject({ regenerated: true, stripped: true });
    expect(r.text).not.toContain("999");
    expect(r.facts).toEqual(["events.0.t_s"]);
  });
});

describe("/api/ask", () => {
  afterEach(() => vi.unstubAllEnvs());
  const post = (body: unknown, ip: string) => new Request("http://x/api/ask", { method: "POST", headers: { "x-forwarded-for": ip }, body: JSON.stringify(body) });
  it("no key → 503 error, never a canned answer", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    const r = await askPOST(post(REQ, "10.1.0.1"));
    expect(r.status).toBe(503);
    const j = await r.json();
    expect(j.error).toContain("OPENAI_API_KEY");
    expect(j.text).toBeUndefined();
  });
  it("validates the body before touching the provider", async () => {
    expect((await askPOST(post({ ...REQ, question: "" }, "10.1.0.2"))).status).toBe(400);
  });
});
