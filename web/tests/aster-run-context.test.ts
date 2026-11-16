// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Aster on a simulator run: retrieval reaches flame-spread and partial-gravity evidence, and the numeric guard
// checks the run's own engine numbers (N > 0).
import { afterEach, describe, expect, it, vi } from "vitest";
import { POST as asterPOST } from "@/app/api/aster/route";
import { answerLocally } from "@/lib/ai/localAster";
import { runContext } from "@/lib/ai/runContext";
import { presetById } from "@/lib/sim/presets";
import { simulate } from "@/lib/sim/engine";
import type { Scenario } from "@/lib/sim/types";

const post = (body: unknown, ip: string) => new Request("http://x/api", { method: "POST", headers: { "x-forwarded-for": ip }, body: JSON.stringify(body) });

describe("Aster on a run", () => {
  afterEach(() => vi.unstubAllEnvs());
  it("ranks BASS-II / Saffire and FM2 / LUCI for the Moon question", () => {
    const ids = answerLocally("Why does the Moon fire last longer?").sources.map((s) => s.id);
    expect(ids).toContain("PSI-25");
    expect(ids.some((id) => id.startsWith("PSI-9") || id === "PSI-100")).toBe(true);
    expect(ids).toContain("NTRS 20240015307");
  });
  it("offline answer uses the run's engine numbers and reports N > 0 checked", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    const { a, b } = presetById("iss-vs-lunar")!.build() as { a: Scenario; b: Scenario };
    const ctx = runContext(a, simulate(a), b, simulate(b))!;
    expect(ctx.facts).toMatch(/171\s?s/);
    const body = await (await asterPOST(post({ question: "Why does the Moon fire last longer?", context: ctx, stream: true }, "10.9.1.1"))).text();
    const done = JSON.parse(body.split("\n").filter((l) => l.startsWith("data:") && l.includes('"type":"done"')).at(-1)!.slice(5));
    expect(done.data.guard.ok).toBe(true);
    expect(done.data.guard.checked).toBeGreaterThan(0);
    expect(done.data.text).toMatch(/171\s?s/);
    expect(done.data.citations).toContain("PSI-25");
  });
});
