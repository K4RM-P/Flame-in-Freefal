// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Seeded Monte Carlo (mulberry32 PRNG + Box-Muller), p05/p50/p95.
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export interface Rng { uniform(lo: number, hi: number): number; normal(mu: number, sd: number): number }
export function makeRng(seed = 20261114): Rng {
  const u = mulberry32(seed);
  return {
    uniform: (lo, hi) => lo + (hi - lo) * u(),
    normal: (mu, sd) => mu + sd * Math.sqrt(-2 * Math.log(1 - u())) * Math.cos(2 * Math.PI * u()),
  };
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function sampleDist(rng: Rng, value: number, dist?: any): number {
  if (!dist) return value;
  if (dist.type === "normal") return rng.normal(value, dist.sd);
  if (dist.type === "uniform") return rng.uniform(dist.lo, dist.hi);
  throw new Error(dist.type);
}
export interface Band { p05: number; p50: number; p95: number }
export function percentiles(xs: (number | null | undefined)[]): Band {
  const a = xs.filter((x): x is number => x != null && Number.isFinite(x)).sort((p, q) => p - q);
  if (!a.length) return { p05: NaN, p50: NaN, p95: NaN };
  const q = (p: number) => { const i = p * (a.length - 1), lo = Math.floor(i), hi = Math.ceil(i); return a[lo] + (a[hi] - a[lo]) * (i - lo); };
  return { p05: q(0.05), p50: q(0.5), p95: q(0.95) };
}
export function monteCarlo(fn: (r: Rng) => number | null, n = 500, seed = 20261114): Band {
  const rng = makeRng(seed);
  const out: (number | null)[] = [];
  for (let i = 0; i < n; i++) { try { out.push(fn(rng)); } catch { /* skip failed sample */ } }
  return percentiles(out);
}
