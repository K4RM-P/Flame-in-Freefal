// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// UI guard: the "Demo Numbers" shortcut is gone and never returns (no demo/placeholder scenario values).
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "..");
const walk = (dir: string): string[] => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? walk(p) : /\.(tsx?|jsx?)$/.test(f) ? [p] : [];
});

describe("no demo-number shortcut", () => {
  it("Onboarding has no demo-numbers button or fillDemo", () => {
    const src = readFileSync(join(ROOT, "components/sim/Onboarding.tsx"), "utf8");
    expect(src).not.toContain("demo-numbers");
    expect(src).not.toContain("fillDemo");
  });
  it("no component references demo-numbers or fillDemo", () => {
    const hits = walk(join(ROOT, "components")).filter((f) => /demo-numbers|fillDemo/.test(readFileSync(f, "utf8")));
    expect(hits).toEqual([]);
  });
});
