// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// UI guard: no component fills illustrative "demo" values; scenarios come from presets, the AI interview or the user.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "..");
const walk = (dir: string): string[] => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? walk(p) : /\.(tsx?|jsx?)$/.test(f) ? [p] : [];
});

describe("no demo-number shortcut", () => {
  it("no component fills demo values", () => {
    const hits = walk(join(ROOT, "components")).filter((f) => /demo-numbers|fillDemo/.test(readFileSync(f, "utf8")));
    expect(hits).toEqual([]);
  });
});
