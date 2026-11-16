// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Shareable runs: the full scenario (A, and B when comparing) encoded in the URL (?s=, base64url JSON), validated with
// the same zod schema as saved states on the way back in. Nothing is stored server-side; the link re-runs the engine.
import { ScenarioSchema, type Scenario } from "./types";

export interface SharePayload { v: 1; a: Scenario; b?: Scenario | null; preset?: string | null }
export const SHARE_MAX = 12_000; // characters of the encoded payload (keeps links well under common URL limits)

const toB64Url = (s: string) => {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const fromB64Url = (s: string) => {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
};

export function encodeShare(a: Scenario, b?: Scenario | null, preset?: string | null): string {
  const p: SharePayload = { v: 1, a, ...(b ? { b } : {}), ...(preset ? { preset } : {}) };
  return toB64Url(JSON.stringify(p));
}

/** Decode and validate; null for anything malformed, oversized or not a valid scenario. */
export function decodeShare(s: string | null | undefined): { a: Scenario; b: Scenario | null; preset: string | null } | null {
  if (!s || s.length > SHARE_MAX || !/^[A-Za-z0-9_-]+$/.test(s)) return null;
  try {
    const raw = JSON.parse(fromB64Url(s)) as Partial<SharePayload>;
    if (raw?.v !== 1) return null;
    const a = ScenarioSchema.safeParse(raw.a);
    const b = raw.b ? ScenarioSchema.safeParse(raw.b) : null;
    if (!a.success || (b && !b.success)) return null;
    return { a: a.data, b: b?.success ? b.data : null, preset: typeof raw.preset === "string" ? raw.preset.slice(0, 60) : null };
  } catch { return null; }
}

export function shareUrl(origin: string, a: Scenario, b?: Scenario | null, preset?: string | null): string {
  return `${origin}/simulator?s=${encodeShare(a, b, preset)}&run=1`;
}
