// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Server-only OpenAI client. The key is read from process.env.OPENAI_API_KEY at request time and never leaves the server.
import OpenAI from "openai";

// Stable Responses API model. OPENAI_MODEL may override this in Vercel when intentionally configured.
export const DEFAULT_MODEL = "gpt-4o-mini";
export const NO_KEY_MESSAGE = "SI offline: explanations are generated locally from the engine.";

export const model = () => process.env.OPENAI_MODEL?.trim() || DEFAULT_MODEL;

/** null when no key is configured; callers must answer 503 with NO_KEY_MESSAGE, never a canned answer. */
export function openaiClient(): OpenAI | null {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return null;
  return new OpenAI({ apiKey: key, timeout: 30_000, maxRetries: 1 });
}
