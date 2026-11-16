// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// U1: Aster answers run questions from the engine result (offline included), cites the right NASA sources, and
// every number survives the numeric guard.
import { afterEach, describe, expect, it, vi } from "vitest";
import { POST as asterPOST } from "@/app/api/aster/route";
import { explainRun, intentOf } from "@/lib/ai/explain";
import { guard, numbersIn } from "@/lib/ai/guard";
import { answerLocally } from "@/lib/ai/localAster";
import { buildRunFacts } from "@/lib/ai/runFacts";
import { runContext } from "@/lib/ai/runContext";
import { RunFactsSchema } from "@/lib/ai/runFactsSchema";
import { simulate } from "@/lib/sim/engine";
import { presetById } from "@/lib/sim/presets";
import type { Scenario } from "@/lib/sim/types";

const { a, b } = presetById("iss-vs-lunar")!.build() as { a: Scenario; b: Scenario };
const facts = buildRunFacts(a, simulate(a), b, simulate(b));
const MOON_Q = "Why does the Moon fire last longer?";

describe("run facts", () => {
  it("validate against the wire schema and stay small", () => {
    expect(RunFactsSchema.safeParse(facts).success).toBe(true);
    expect(JSON.stringify(facts).length).toBeLessThan(12_000);
  });
});

describe("explainRun", () => {
  it.each([
    [MOON_Q, "duration"], ["Why didn't the extinguisher put it out?", "extinguisher"], ["What should we fix first?", "fix"],
    ["Which NASA test is closest?", "evidence"], ["What test should NASA fly next?", "next-test"], ["What does gravity change?", "gravity"],
    ["How far outside the tested oxygen is this?", "oxygen"], ["Summarise", "summary"],
  ])("routes %j to %s", (q, intent) => expect(intentOf(q)).toBe(intent));

  it("answers the Moon question from the run: numbers, end reasons, Saffire + BASS-II + FM2 citations", () => {
    const e = explainRun(MOON_Q, facts);
    const g = guard(e.text, [facts], MOON_Q);
    expect(g.ok).toBe(true);
    expect(numbersIn(e.text).length).toBeGreaterThan(5); // not "0 numbers checked"
    expect(e.text).toContain(`${facts.compare!.ratio}×`);
    expect(e.text).toMatch(/quench/);
    expect(e.text).toMatch(/non-conservative/);
    expect(e.citations).toEqual(expect.arrayContaining(["PSI-98", "PSI-25"]));
    expect(e.links.map((l) => l.id)).toContain("ntrs-20240015307");
    expect(e.followUps.length).toBe(3);
  });

  it("every intent passes the numeric guard against the run facts", () => {
    for (const q of ["Why didn't the extinguisher put it out?", "What should we fix first?", "Which NASA test is closest?", "What test should NASA fly next?", "What does gravity change?", "oxygen?", "Summarise"]) {
      const e = explainRun(q, facts);
      expect(guard(e.text, [facts], q).ok, q).toBe(true);
    }
  });
});

describe("catalog retrieval (no run on screen)", () => {
  it("finds Saffire records for a Saffire question", () => {
    expect(answerLocally("What did Saffire find?").sources.map((s) => s.id)).toEqual(expect.arrayContaining(["PSI-98", "PSI-99"]));
  });
  it("Moon questions say PSI has no partial-gravity data and surface FM2 (outside PSI)", () => {
    const a = answerLocally("Does fabric burn more on the Moon?");
    expect(a.answer).toMatch(/PSI holds microgravity and 1 g tests only/);
    expect(a.sources.map((s) => s.id)).toContain("NTRS 20240015307");
  });
});

describe("/api/aster with a run context, no key", () => {
  afterEach(() => vi.unstubAllEnvs());
  it("streams an engine answer with citations, links and follow-ups", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    const ctx = { ...runContext(a, simulate(a), b, simulate(b))!, question: MOON_Q, data: facts };
    const r = await asterPOST(new Request("http://x/api", { method: "POST", headers: { "x-forwarded-for": "10.9.9.1" }, body: JSON.stringify({ stream: true, question: MOON_Q, context: ctx }) }));
    const body = await r.text();
    expect(body).not.toContain('"type":"error"');
    const done = body.split("\n").filter((l) => l.startsWith("data:")).map((l) => JSON.parse(l.slice(5))).find((e) => e.type === "done");
    expect(done.data.mode).toBe("engine");
    expect(done.data.guard.ok).toBe(true);
    expect(done.data.guard.checked).toBeGreaterThan(5);
    expect(done.data.citations).toEqual(expect.arrayContaining(["PSI-98", "PSI-25"]));
    expect(done.data.links.map((l: { id: string }) => l.id)).toContain("ntrs-20240015307");
  });
});
