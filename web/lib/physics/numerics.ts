// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Root finding and bounded minimisation (Brent), matching scipy tolerances used in emberphys.

export function brentq(f: (x: number) => number, a: number, b: number, xtol = 1e-12, rtol = 8.88e-16, maxiter = 200): number {
  let fa = f(a), fb = f(b);
  if (fa * fb > 0) throw new Error("brentq: root not bracketed");
  if (fa === 0) return a;
  if (fb === 0) return b;
  let c = a, fc = fa, d = b - a, e = d;
  for (let i = 0; i < maxiter; i++) {
    if (fb * fc > 0) { c = a; fc = fa; d = b - a; e = d; }
    if (Math.abs(fc) < Math.abs(fb)) { a = b; b = c; c = a; fa = fb; fb = fc; fc = fa; }
    const tol = 2 * rtol * Math.abs(b) + 0.5 * xtol;
    const m = 0.5 * (c - b);
    if (Math.abs(m) <= tol || fb === 0) return b;
    if (Math.abs(e) >= tol && Math.abs(fa) > Math.abs(fb)) {
      const s = fb / fa;
      let p: number, q: number;
      if (a === c) { p = 2 * m * s; q = 1 - s; }
      else {
        const qq = fa / fc, r = fb / fc;
        p = s * (2 * m * qq * (qq - r) - (b - a) * (r - 1));
        q = (qq - 1) * (r - 1) * (s - 1);
      }
      if (p > 0) q = -q; else p = -p;
      if (2 * p < Math.min(3 * m * q - Math.abs(tol * q), Math.abs(e * q))) { e = d; d = p / q; }
      else { d = m; e = d; }
    } else { d = m; e = d; }
    a = b; fa = fb;
    b += Math.abs(d) > tol ? d : m > 0 ? tol : -tol;
    fb = f(b);
  }
  return b;
}

/** Maximise g on [lo, hi] (golden-section + parabolic, Brent). Returns {x, fx}. */
export function maximize(g: (x: number) => number, lo: number, hi: number, xatol = 1e-9): { x: number; fx: number } {
  const f = (x: number) => -g(x);
  const C = 0.5 * (3 - Math.sqrt(5));
  let a = lo, b = hi;
  let x = a + C * (b - a), w = x, vv = x;
  let fx = f(x), fw = fx, fv = fx;
  let d = 0, e = 0;
  for (let i = 0; i < 500; i++) {
    const xm = 0.5 * (a + b);
    const tol1 = 1.4901161193847656e-8 * Math.abs(x) + xatol / 3;
    const tol2 = 2 * tol1;
    if (Math.abs(x - xm) <= tol2 - 0.5 * (b - a)) break;
    let golden = true;
    if (Math.abs(e) > tol1) {
      let r = (x - w) * (fx - fv), q = (x - vv) * (fx - fw), p = (x - vv) * q - (x - w) * r;
      q = 2 * (q - r);
      if (q > 0) p = -p;
      q = Math.abs(q);
      const etemp = e; e = d;
      if (!(Math.abs(p) >= Math.abs(0.5 * q * etemp) || p <= q * (a - x) || p >= q * (b - x))) {
        d = p / q; const u = x + d;
        if (u - a < tol2 || b - u < tol2) d = xm >= x ? tol1 : -tol1;
        golden = false;
      }
    }
    if (golden) { e = x >= xm ? a - x : b - x; d = C * e; }
    const u = x + (Math.abs(d) >= tol1 ? d : d > 0 ? tol1 : -tol1);
    const fu = f(u);
    if (fu <= fx) { if (u >= x) a = x; else b = x; vv = w; fv = fw; w = x; fw = fx; x = u; fx = fu; }
    else {
      if (u < x) a = u; else b = u;
      if (fu <= fw || w === x) { vv = w; fv = fw; w = u; fw = fu; }
      else if (fu <= fv || vv === x || vv === w) { vv = u; fv = fu; }
    }
  }
  return { x, fx: -fx };
}

export function linspace(a: number, b: number, n: number): number[] {
  return Array.from({ length: n }, (_, i) => a + ((b - a) * i) / (n - 1));
}
