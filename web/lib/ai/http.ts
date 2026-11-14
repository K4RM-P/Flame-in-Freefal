// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Shared route plumbing: per-IP token bucket, body size cap, JSON responses.
const RATE = { capacity: 8, refill_per_s: 8 / 60 }; // 8 requests burst, 8 per minute sustained
const buckets = new Map<string, { tokens: number; t: number }>();

export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
}

/** true when the request is allowed (consumes one token). */
export function take(ip: string, now = Date.now()): boolean {
  const b = buckets.get(ip) ?? { tokens: RATE.capacity, t: now };
  b.tokens = Math.min(RATE.capacity, b.tokens + ((now - b.t) / 1000) * RATE.refill_per_s);
  b.t = now;
  const ok = b.tokens >= 1;
  if (ok) b.tokens -= 1;
  buckets.set(ip, b);
  if (buckets.size > 5000) buckets.clear();
  return ok;
}

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });

/** Reads a JSON body no larger than maxBytes; returns an error Response otherwise. */
export async function readJson(req: Request, maxBytes: number): Promise<{ body: unknown } | { error: Response }> {
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > maxBytes) return { error: json({ error: `request too large (max ${maxBytes} bytes)` }, 413) };
  const text = await req.text();
  if (text.length > maxBytes) return { error: json({ error: `request too large (max ${maxBytes} bytes)` }, 413) };
  try { return { body: JSON.parse(text) }; } catch { return { error: json({ error: "invalid JSON" }, 400) }; }
}

export function gate(req: Request): Response | null {
  return take(clientIp(req)) ? null : json({ error: "rate limited; try again in a minute" }, 429);
}
