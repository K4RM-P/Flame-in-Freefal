// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Numeric guard: every number in an answer must appear in tool outputs (to rounding, allowing unit scalings).
const SCALES = [1, 100, 0.01, 1000, 0.001, 1e6, 1e-6, 60, 1 / 60, 1 / 6.894757293168, 6.894757293168];
const NUM = /(?<![\w.:-])[-−]?\d+(?:[.,]\d+)*(?:\.\d+)?(?:[eE][-+]?\d+)?/g;

export function numbersIn(text: string): number[] {
  // Thin/no-break-space digit groups (web/lib/ui/format.ts writes 4 920) are one number, not 4 and 920.
  const clean = text.replace(/(\d)[\u2009\u202f\u00a0](?=\d{3}\b)/g, "$1").replace(/\[(?:S|M):[^\]]*\]/g, " ").replace(/\b(?:V\d+b?|U\d+|SP\d|DR\d|SU\d|BS\d|GR\d|HA\d|SM\d|TH\d|FLEX-\d+|NTRS \d+|JSC[- ]\d+|NASA-STD-\d+|NASA\/TP-\d+-\d+|ICES-\d+-\d+|Saffire[- ]?[IVX]+|BASS-II|FLEX-2|CO₂|O₂|N₂|CO2|O2|N2|H2O|H₂O|d43|d10|d30|p05|p50|p95|d²|r_f|C_thin|\d{4}-\d{2}-\d{2})\b/gi, " ");
  return (clean.match(NUM) ?? []).map((s) => Number(s.replace("−", "-").replace(/,(?=\d{3}\b)/g, ""))).filter((x) => Number.isFinite(x));
}

export function collectNumbers(obj: unknown, out: number[] = []): number[] {
  if (typeof obj === "number" && Number.isFinite(obj)) out.push(obj);
  else if (typeof obj === "string") out.push(...numbersIn(obj));
  else if (Array.isArray(obj)) obj.forEach((o) => collectNumbers(o, out));
  else if (obj && typeof obj === "object") Object.values(obj).forEach((o) => collectNumbers(o, out));
  return out;
}

const decimals = (x: number) => { const s = String(x); const i = s.indexOf("."); return i < 0 ? 0 : s.length - i - 1; };

/** A number is supported if some tool number (under a unit scaling) rounds to it at the answer's precision, or within 1%. */
export function supported(x: number, pool: number[], allowed: number[] = []): boolean {
  if (Number.isInteger(x) && Math.abs(x) <= 12) return true; // list ordinals, small counts ("3 minutes", "5 tests")
  if (allowed.some((a) => a === x)) return true;
  const dp = decimals(x);
  const tol = Math.max(0.5 * 10 ** -dp, Math.abs(x) * 0.01);
  for (const p of pool) for (const s of SCALES) if (Math.abs(p * s - x) <= tol) return true;
  return false;
}

export interface GuardResult { ok: boolean; unsupported: number[]; text: string }

export function guard(answer: string, toolOutputs: unknown[], question = ""): GuardResult {
  const pool = collectNumbers(toolOutputs);
  const allowed = numbersIn(question);
  const unsupported = numbersIn(answer).filter((x) => !supported(x, pool, allowed));
  return { ok: unsupported.length === 0, unsupported, text: answer };
}

/** Drop sentences that carry unsupported numbers and append a marker. */
export function stripUnsupported(answer: string, toolOutputs: unknown[], question = ""): string {
  const pool = collectNumbers(toolOutputs), allowed = numbersIn(question);
  let removed = false;
  const kept = answer.split(/(?<=[.!?])\s+(?=[A-Z[(*-])/).filter((s) => {
    const bad = numbersIn(s).some((x) => !supported(x, pool, allowed));
    if (bad) removed = true;
    return !bad;
  });
  return kept.join(" ") + (removed ? " (removed unsupported claim)" : "");
}
