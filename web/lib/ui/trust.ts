// Trust dials for the Validation Lab, derived from held-out validation JSON + droplet MC bands (no new physics).
import kJson from "@/data/validation/droplet_K.json";
import dJson from "@/data/validation/droplet_dext.json";
import { runDroplet } from "@/lib/physics/models";
import { TEST_POINTS } from "@/lib/testPoints";

/* eslint-disable @typescript-eslint/no-explicit-any */
const K = kJson as any, DX = dJson as any;
const median = (a: number[]) => { const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

export function trust() {
  const kErr = K.parity.map((p: any) => Math.abs(p.pred - p.obs) / p.obs);
  const dErr = DX.parity.filter((p: any) => p.pred != null).map((p: any) => Math.abs(p.pred - p.obs) / p.obs);
  // Precision + reliability: p05–p95 band of K for each held-out test (MC over properties + f_k), coverage of observations.
  let inside = 0; const widths: number[] = [];
  for (const p of K.parity) {
    const t = TEST_POINTS.find((q) => q.id === p.id);
    const r = runDroplet(p.fuel, p.x_o2, p.P_kPa, t?.d0_mm ?? 3, p.diluent, t?.x_diluent ?? 0, 100);
    widths.push((r.uncertainty.p95 - r.uncertainty.p05) / r.uncertainty.p50);
    if (p.obs >= r.uncertainty.p05 && p.obs <= r.uncertainty.p95) inside++;
  }
  return {
    accuracy: { value: median(kErr) * 100, n: kErr.length, dext: median(dErr) * 100, nd: dErr.length },
    precision: { value: median(widths) * 100 },
    reliability: { value: (inside / K.parity.length) * 100, n: K.parity.length },
  };
}
