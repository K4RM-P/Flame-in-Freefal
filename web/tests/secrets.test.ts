// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Fails if any tracked file contains something shaped like an OpenAI API key.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const KEY = /sk-(proj-)?[A-Za-z0-9_-]{20,}/;
const root = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();

describe("secrets", () => {
  it("no tracked file contains an API key", () => {
    const files = execFileSync("git", ["ls-files", "-z"], { cwd: root, encoding: "utf8", maxBuffer: 64 << 20 }).split("\0").filter(Boolean);
    const hits: string[] = [];
    for (const f of files) {
      const p = path.join(root, f);
      if (!fs.existsSync(p) || fs.statSync(p).size > 20 << 20) continue;
      const buf = fs.readFileSync(p);
      if (buf.includes(0)) continue; // binary
      const m = buf.toString("utf8").match(KEY);
      if (m) hits.push(`${f}: ${m[0].slice(0, 8)}…`);
    }
    expect(hits).toEqual([]);
  });
  it("env files hold no value", () => {
    for (const f of [".env.example", ".env.local"]) {
      const p = path.join(root, "web", f);
      if (fs.existsSync(p)) expect(fs.readFileSync(p, "utf8")).toMatch(/^OPENAI_API_KEY=$/m);
    }
  });
});
