// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
import { describe, expect, it } from "vitest";
import { MATERIALS } from "@/lib/sim/params";
import { simulate } from "@/lib/sim/engine";
import { presetById } from "@/lib/sim/presets";
import { applyNoFireFix, firstBurningFrame, noFireReason } from "@/lib/sim/noFire";
import { MAX_QUESTIONS, QuestionsSchema, SYNONYMS, buildLocal, fixedQuestions, matchMaterial, questionFor } from "@/lib/ai/localScenario";
import type { Scenario } from "@/lib/sim/types";
import { guard } from "@/lib/ai/guard";

const keys = new Set(MATERIALS.map((m) => m.material_key));
const run = (p: string) => { const d = buildLocal(p); const s = d.scenario!; const r = s.items.length ? simulate(s) : null; return { d, s, r }; };

describe("material synonyms", () => {
  it("never returns an id outside materials.json", () => {
    for (const [, k] of SYNONYMS) expect(keys.has(k)).toBe(true);
    for (const w of ["cotton", "fabric", "acrylic", "plastic", "nomex", "paper", "wood", "cable", "xyz"]) { const k = matchMaterial(w); if (k) expect(keys.has(k)).toBe(true); }
    expect(matchMaterial("paper")).toBeNull();
  });
});

describe("ai-fire-check prompts", () => {
  it("cotton fabric on the ISS burns", () => { const { r } = run("ISS module, cotton fabric panel catches fire"); expect(firstBurningFrame(r)).toBeGreaterThanOrEqual(0); });
  it("empty ISS module → Nothing to catch fire", () => { const { s, r, d } = run("empty ISS module"); expect(noFireReason(s, r, d.rejected)?.title).toBe("Nothing to catch fire"); });
  it("paper → Material not in NASA's data, fix burns", () => {
    const { s, r, d } = run("Cygnus cargo ship, paper burning");
    const nf = noFireReason(s, r, d.rejected)!; expect(nf.reason).toBe("material_not_in_data");
    expect(firstBurningFrame(simulate(applyNoFireFix(s, nf.fix!)))).toBeGreaterThanOrEqual(0);
  });
});

describe("noFire reasons", () => {
  const base = presetById("lunar-tune")!.build() as Scenario;
  it("no ignition source", () => { const s = { ...base, items: base.items.map((i) => ({ ...i, ignite: false })) }; expect(noFireReason(s, simulate(s))?.reason).toBe("no_ignition"); });
  it("too little oxygen cites the engine", () => { const s = { ...base, cabin: { ...base.cabin, x_o2: 0.05 } }; const nf = noFireReason(s, simulate(s)); expect(nf?.reason).toBe("too_little_oxygen"); });
  it("nothing to burn / material", () => {
    expect(noFireReason({ ...base, items: [] }, null)?.reason).toBe("nothing_to_burn");
    expect(noFireReason({ ...base, items: [] }, null, [{ requested: "paper", closest: "sibal" }])?.reason).toBe("material_not_in_data");
  });
});

describe("interview", () => {
  it("caps follow-ups at 4", () => {
    expect(fixedQuestions(["where", "material", "ignition", "detector", "extinguisher"]).length).toBeLessThanOrEqual(MAX_QUESTIONS);
    expect(QuestionsSchema.safeParse({ questions: Array(5).fill(questionFor("where")) }).success).toBe(false);
  });
});

describe("guard on a streamed answer", () => {
  it("rejects a made-up number once the chunks are joined", () => {
    const chunks = ["Peak heat release was ", "1234", "5 W."];
    expect(guard(chunks.join(""), [{ peak_Q: 2580.2 }]).ok).toBe(false);
  });
});
