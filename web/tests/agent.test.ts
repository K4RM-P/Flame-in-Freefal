import { describe, expect, it } from "vitest";
import { guard, numbersIn, stripUnsupported, supported } from "@/lib/ai/guard";
import { GOLDEN, matchGolden, offlineAnswer } from "@/lib/ai/golden";
import { TOOL_DEFS, runTool } from "@/lib/ai/tools";
import cache from "@/data/cache/golden.json";

describe("guard", () => {
  it("extracts numbers but ignores citation pills and ids", () => {
    expect(numbersIn("K is 0.54 mm²/s [S:ntrs-20150023456] per V5 and FLEX-136")).toEqual([0.54]);
  });
  it("accepts rounding and unit scalings, rejects invented numbers", () => {
    const pool = [0.19724, 56.5, 24.218];
    expect(supported(0.197, pool)).toBe(true);
    expect(supported(19.7, pool)).toBe(true);     // fraction -> %
    expect(supported(24.2, pool)).toBe(true);
    expect(supported(8.19, pool)).toBe(true);     // 56.5 kPa -> psia
    expect(supported(0.31, pool)).toBe(false);
    expect(supported(3, pool)).toBe(true);        // small integers allowed
  });
  it("flags and strips unsupported sentences", () => {
    const outs = [{ value: 4.58 }];
    expect(guard("Spread is 4.58 mm/s. It doubles to 9.9 mm/s on the Moon.", outs).ok).toBe(false);
    expect(stripUnsupported("Spread is 4.58 mm/s. It doubles to 9.9 mm/s on the Moon.", outs)).toBe("Spread is 4.58 mm/s. (removed unsupported claim)");
  });
});

describe("tools", () => {
  it("validates inputs with zod and exposes JSON schemas", () => {
    expect(TOOL_DEFS.length).toBeGreaterThanOrEqual(14);
    expect((runTool("run_spread", { material: "wood" }) as { error: string }).error).toBe("invalid input");
  });
  it("is deterministic", () => {
    const a = runTool("run_suppression", { fuel: "n-heptane", x_o2: 0.21, P_kPa: 101.3, agent: "CO2" });
    const b = runTool("run_suppression", { fuel: "n-heptane", x_o2: 0.21, P_kPa: 101.3, agent: "CO2" });
    expect(a).toEqual(b);
  });
});

describe("golden questions", () => {
  it.each(GOLDEN.map((g) => [g.id, g] as const))("Q%i calls required tools, cites, and passes the guard", (_id, g) => {
    const a = offlineAnswer(g);
    for (const t of g.requires) expect(a.trace.map((x) => x.name)).toContain(t);
    for (const c of g.cites) expect(a.answer).toContain(`[${c}`);
    expect(a.guard.unsupported).toEqual([]);
    expect(matchGolden(g.q)?.id).toBe(g.id);
  });
  it("cache covers all 12 questions", () => {
    expect((cache as { id: number }[]).map((c) => c.id).sort((x, y) => x - y)).toEqual(GOLDEN.map((g) => g.id));
  });
  it("Q9 never claims partial-gravity data are measured", () => {
    const a = offlineAnswer(GOLDEN[8]);
    expect(a.answer).toMatch(/bounded estimate/);
    expect(a.answer).toMatch(/^No\./);
  });
});

import { GOLDEN_QUESTIONS } from "@/lib/ai/questions";
describe("client question list", () => {
  it("matches the golden questions exactly", () => expect([...GOLDEN_QUESTIONS]).toEqual(GOLDEN.map((g) => g.q)));
});
