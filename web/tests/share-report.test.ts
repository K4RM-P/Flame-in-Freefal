// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// U5: shareable run links, the Markdown run report and the next-test brief.
import { describe, expect, it } from "vitest";
import { simulate } from "@/lib/sim/engine";
import { nextTest } from "@/lib/sim/nextTest";
import { presetById } from "@/lib/sim/presets";
import { nextTestBriefMarkdown, runReportMarkdown } from "@/lib/sim/report";
import { decodeShare, encodeShare, shareUrl } from "@/lib/sim/share";
import { sig } from "@/lib/ui/format";
import type { Scenario } from "@/lib/sim/types";

const { a, b } = presetById("iss-vs-lunar")!.build() as { a: Scenario; b: Scenario };

describe("share links", () => {
  it("round-trip A and B exactly, URL-safe", () => {
    const enc = encodeShare(a, b, "iss-vs-lunar");
    expect(enc).toMatch(/^[A-Za-z0-9_-]+$/);
    const d = decodeShare(enc)!;
    expect(d.a).toEqual(a); expect(d.b).toEqual(b); expect(d.preset).toBe("iss-vs-lunar");
    expect(shareUrl("https://x.app", a)).toMatch(/^https:\/\/x\.app\/simulator\?s=[A-Za-z0-9_-]+&run=1$/);
  });
  it("rejects tampered or invalid payloads instead of running them", () => {
    expect(decodeShare("not base64 !")).toBeNull();
    expect(decodeShare(encodeShare(a).slice(0, 40))).toBeNull();
    const bad = structuredClone(a); bad.cabin.x_o2 = 7;
    expect(decodeShare(encodeShare(bad))).toBeNull();
  });
  it("a decoded link reproduces the same engine numbers", () => {
    const d = decodeShare(encodeShare(a, b))!;
    expect(simulate(d.b!).outcome.metrics).toEqual(simulate(b).outcome.metrics);
  });
});

describe("run report and next-test brief", () => {
  const ra = simulate(a), rb = simulate(b);
  it("report carries inputs, engine outcomes, end reasons, caveats and sources", () => {
    const md = runReportMarkdown(a, ra, b, rb, "https://x.app/simulator?s=abc");
    const te = rb.outcome.metrics.find((m) => m.key === "time_to_extinguish")!.value!;
    expect(md).toContain(`${sig(te, 3)} s`);
    expect(md).toContain("burned out");
    expect(md).toContain("quenched");
    expect(md).toContain("NTRS");
    expect(md).toContain("## Sources");
    expect(md).not.toMatch(/undefined|NaN/);
  });
  it("brief exists only outside the envelope, names the condition, the rig and the nearest PSI evidence", () => {
    expect(nextTestBriefMarkdown(a, ra)).toBeNull(); // ISS SIBAL sample: inside the tested envelope
    const md = nextTestBriefMarkdown(b, rb)!;
    const nt = nextTest(b, rb)!;
    expect(md).toContain(nt.condition);
    expect(md).toContain(nt.rig);
    for (const acc of nt.investigations) expect(md).toContain(acc);
    expect(md).toContain("TODO_VERIFY");
    expect(md).not.toMatch(/undefined|NaN/);
  });
});
