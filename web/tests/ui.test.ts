// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// UI guard: the "Demo Numbers" shortcut lives only in manual setup and is always labelled as not NASA data.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "..");
const walk = (dir: string): string[] => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? walk(p) : /\.(tsx?|jsx?)$/.test(f) ? [p] : [];
});

describe("demo-number shortcut", () => {
  it("Onboarding offers Demo Numbers with a visible not-NASA label", () => {
    const src = readFileSync(join(ROOT, "components/sim/Onboarding.tsx"), "utf8");
    expect(src).toContain('data-testid="demo-numbers"');
    expect(src).toContain("values are not NASA measurements");
  });
  it("no other component fills demo values", () => {
    const hits = walk(join(ROOT, "components")).filter((f) => /demo-numbers|fillDemo/.test(readFileSync(f, "utf8")));
    expect(hits.map((f) => f.replace(ROOT + "/", ""))).toEqual(["components/sim/Onboarding.tsx"]);
  });
});
