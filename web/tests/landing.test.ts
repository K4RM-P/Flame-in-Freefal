// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Quality gate: no number on the landing page is a literal. Stats come from lib/landing/facts (data files + engine).
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import tablesIndex from "@/data/psi/tables_index.json";
import flex from "@/data/psi/flex_crosscheck.json";
import { landingFacts } from "@/lib/landing/facts";
import { earthVsOrbitSummary } from "@/lib/sim/evidence";

const DIR = join(__dirname, "..", "components", "landing");
const src = readdirSync(DIR).filter((f) => f.endsWith(".tsx")).map((f) => [f, readFileSync(join(DIR, f), "utf8")] as const);
const facts = readFileSync(join(__dirname, "..", "lib", "landing", "facts.ts"), "utf8");

describe("landing numbers", () => {
  it("facts.ts reads web/data and the engine", () => {
    expect(facts).toMatch(/from "@\/data\/psi\/tables_index\.json"/);
    expect(facts).toMatch(/from "@\/lib\/sim\/engine"/);
    expect(facts).toMatch(/from "@\/lib\/sim\/evidence"/);
  });
  it("landing components contain no hard-coded stat values", () => {
    // The values the page shows, as they would appear if typed in by hand.
    const banned = [/\b2,?818\b/, /\b1,?533\b/, /\b1\.9\s*×/, /\b22\.2\s*%/, /\b13\.3\s*%/, /\b4\s*\/\s*3\s*\/\s*0\b/, /\b322\b/, /\b170\b/, />\s*18\s*</, />\s*34\s*%/];
    for (const [f, s] of src) for (const re of banned) expect(re.test(s), `${f} contains ${re}`).toBe(false);
  });
  it("stat components take their values from props, not literals", () => {
    const sections = src.find(([f]) => f === "Sections.tsx")![1];
    for (const m of sections.matchAll(/<Stat value=\{([^}]+)\}/g)) expect(m[1]).not.toMatch(/^\s*[\d.]+\s*$/);
  });
  it("facts match the data files", () => {
    const f = landingFacts();
    expect(f.psi.rows).toBe((tablesIndex as { rows: number }[]).reduce((s, t) => s + t.rows, 0));
    expect(f.flex.compared).toBe((flex as { values_compared: number }).values_compared);
    expect(f.orbit).toEqual(expect.objectContaining(earthVsOrbitSummary().counts));
    expect(f.run?.ratio).toBeGreaterThan(1);
  });
});
