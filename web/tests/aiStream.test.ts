// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
import { beforeAll, describe, expect, it } from "vitest";
import { POST as interpretPOST } from "@/app/api/interpret/route";
import { POST as asterPOST } from "@/app/api/aster/route";
import { POST as scenarioPOST } from "@/app/api/scenario/route";
import { emptyRun, readEvents, reduceRun, type AiEvent } from "@/lib/ai/stream";
import { guard } from "@/lib/ai/guard";
import { parseWhatIf, suggestQuestions, whatIfAnswer, whatIfFacts } from "@/lib/ai/whatIf";
import { simulate } from "@/lib/sim/engine";
import { presetById } from "@/lib/sim/presets";
import type { Scenario } from "@/lib/sim/types";

beforeAll(() => { delete process.env.OPENAI_API_KEY; });
let ip = 0;
const post = (body: unknown) => new Request("http://x/api", { method: "POST", headers: { "x-forwarded-for": `10.9.0.${++ip}` }, body: JSON.stringify(body) });
async function events(res: Response) { const out: AiEvent[] = []; await readEvents(res, (e) => out.push(e)); return out; }
const lunar = () => presetById("lunar-design-review")!.build() as Scenario;
const compact = (r: ReturnType<typeof simulate>) => ({ outcome: r.outcome, events: r.events, warnings: r.warnings, provenance: r.provenance });

describe("streaming /api/interpret (offline)", () => {
  it("emits real steps in order, tokens, a guard check and done", async () => {
    const s = lunar(), r = simulate(s);
    const ev = await events(await interpretPOST(post({ stream: true, brief: true, scenario: s, result: compact(r), evidence: [{ accession: "PSI-98", title: "Saffire-I" }] })));
    const steps = ev.filter((e) => e.type === "step" && e.status === "done").map((e) => (e as { id: string }).id);
    expect(steps.slice(0, 4)).toEqual(["evidence", "sim", "review", "model"]);
    expect(steps).toContain("guard");
    expect(ev.some((e) => e.type === "token")).toBe(true);
    const done = ev.find((e) => e.type === "done") as unknown as { data: { offline: boolean; guard: { ok: boolean } } };
    expect(done.data.offline).toBe(true);
    expect(done.data.guard.ok).toBe(true);
    // every step that finished was first announced as active (no fake, pre-ticked steps)
    for (const id of steps) expect(ev.findIndex((e) => e.type === "step" && (e as { id: string }).id === id && e.status === "active")).toBeGreaterThanOrEqual(0);
  });
  it("the guard rejects a made-up number in a streamed answer", () => {
    let run = emptyRun();
    for (const t of ["Peak heat ", "98", "765 W."]) run = reduceRun(run, { type: "token", text: t });
    expect(run.text).toBe("Peak heat 98765 W.");
    expect(guard(run.text, [compact(simulate(lunar()))]).ok).toBe(false);
  });
});

describe("streaming /api/aster (offline)", () => {
  it("searches the catalog, checks numbers and finishes offline", async () => {
    const ev = await events(await asterPOST(post({ stream: true, question: "What did Saffire-II test?" })));
    expect(ev.find((e) => e.type === "step" && (e as { id: string }).id === "search")).toBeTruthy();
    const done = ev.find((e) => e.type === "done") as unknown as { data: { offline: boolean } };
    expect(done.data.offline).toBe(true);
  });
});

describe("/api/scenario interview contract (offline)", () => {
  it("parse → followups (≤ 4) → finalize valid", async () => {
    const text = "lunar habitat with a SIBAL curtain";
    const p = await (await scenarioPOST(post({ mode: "parse", text }))).json();
    const f = await (await scenarioPOST(post({ mode: "followups", text, answers: p.draft.answers }))).json();
    expect(f.questions.length).toBeLessThanOrEqual(4);
    expect(f.offline).toBe(true);
    const fin = await (await scenarioPOST(post({ mode: "finalize", text, answers: { ...p.draft.answers, ignition: "wire", detector: "yes", extinguisher: "yes" } }))).json();
    expect(fin.valid).toBe(true);
    expect(fin.draft.scenario.items.some((i: { ignite: boolean }) => i.ignite)).toBe(true);
  });
});

describe("what-if runs the engine", () => {
  it("detects an O₂ change and answers with engine numbers only", () => {
    const s = lunar(), r = simulate(s);
    const w = parseWhatIf("What if I cut the oxygen to 21%?", s)!;
    expect(w.scenario.cabin.x_o2).toBeCloseTo(0.21);
    const r2 = simulate(w.scenario);
    const text = whatIfAnswer(w, r, r2);
    expect(guard(text, [compact(r), compact(r2), whatIfFacts(r, r2), w.scenario, s], "What if I cut the oxygen to 21%?").ok).toBe(true);
  });
  it("ignores plain questions and suggests three", () => {
    const s = lunar();
    expect(parseWhatIf("Which NASA test is closest?", s)).toBeNull();
    expect(suggestQuestions(s, simulate(s))).toHaveLength(3);
  });
});
