// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Every AI entry point must answer usefully with no OPENAI_API_KEY (the Vercel default).
import { afterEach, describe, expect, it, vi } from "vitest";
import { POST as asterPOST } from "@/app/api/aster/route";
import { POST as scenarioPOST } from "@/app/api/scenario/route";
import { AI_OFFLINE_NOTE } from "@/lib/ai/asterContext";

const post = (body: unknown, ip: string) => new Request("http://x/api", { method: "POST", headers: { "x-forwarded-for": ip }, body: JSON.stringify(body) });
const ctx = { kind: "run" as const, label: "ISS vs Moon base", facts: "ISS: extinct at 30 s.", question: "Why?" };

describe("AI entry points with no key", () => {
  afterEach(() => vi.unstubAllEnvs());
  it("Aster context question answers locally, never errors", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    const r = await asterPOST(post({ question: "Why did ISS go out?", context: ctx }, "10.9.0.1"));
    expect(r.status).toBe(200);
    const j = await r.json();
    expect(j.offline).toBe(true);
    expect(j.answer).toContain(AI_OFFLINE_NOTE);
    expect(j.answer).toContain(ctx.facts);
  });
  it("Aster streamed context question ends in done, not error", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    const r = await asterPOST(post({ question: "Why?", context: ctx, stream: true }, "10.9.0.2"));
    const body = await r.text();
    expect(body).not.toContain('"type":"error"');
    expect(body).toContain('"type":"done"');
  });
  it("Aster catalog question answers from the NASA catalog", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    const r = await asterPOST(post({ question: "flame spread in microgravity", stream: true }, "10.9.0.3"));
    const body = await r.text();
    expect(body).toContain('"type":"done"');
    expect(body).not.toContain('"type":"error"');
  });
  it("Build with AI interview falls back to the local parser", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    const r = await scenarioPOST(post({ text: "ISS cabin with SIBAL" }, "10.9.0.4"));
    expect(r.status).toBe(200);
    expect((await r.json()).offline).toBe(true);
  });
});
