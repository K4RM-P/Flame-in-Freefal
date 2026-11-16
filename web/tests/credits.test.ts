// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// U6: every credited resource has a full public URL and a licence; the web copy matches docs/REFERENCES.json.
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import refs from "@/data/references.json";
import pkg from "../package.json";

const R = refs as unknown as Record<string, unknown[]> & { software: { name: string; license: string; url: string }[] };
describe("credits", () => {
  it("web/data/references.json is the same file as docs/REFERENCES.json", () => {
    expect(JSON.parse(fs.readFileSync(path.join(__dirname, "..", "..", "docs", "REFERENCES.json"), "utf8"))).toEqual(refs);
  });
  it("every runtime and dev dependency is credited with a licence and URL", () => {
    const names = new Set(R.software.map((l) => l.name));
    for (const n of [...Object.keys(pkg.dependencies), ...Object.keys(pkg.devDependencies)]) expect(names.has(n), n).toBe(true);
    for (const l of R.software) { expect(l.license).not.toBe("UNKNOWN"); expect(l.url).toMatch(/^https:\/\//); }
  });
  it("fonts, images, component sources and AI tools all have https URLs", () => {
    for (const k of ["fonts", "images", "component_sources"]) for (const x of R[k] as { url: string }[]) expect(x.url, k).toMatch(/^https:\/\//);
    expect((R.si_tools as { name: string }[]).map((t) => t.name).join(" ")).toMatch(/Claude Code.*Codex.*OpenAI API/);
  });
});
