// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Next test to fly: the scenario condition outside the PSI envelope whose extrapolation moves the outcome most.
// "Uncertainty" here = outcome shift between the scenario and the same scenario clamped back to the nearest tested
// condition (for gravity: the µg ↔ 1 g bound). It ranks conditions; it is not a confidence interval.
import investigationsJ from "@/data/investigations.json";
import { simulate } from "./engine";
import { MATERIALS, SOLID_ENVELOPE } from "./params";
import type { Scenario, SimResult } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface NextTest { condition: string; why: string; rig: string; investigations: string[]; shift: number; param: string }
const INV = investigationsJ as Record<string, any>;
const clamp = (x: number, r: [number, number]) => Math.min(r[1], Math.max(r[0], x));
const clone = (s: Scenario): Scenario => JSON.parse(JSON.stringify(s));

function shift(a: SimResult, b: SimResult): number {
  const g = (r: SimResult, k: string) => r.outcome.metrics.find((m) => m.key === k)?.value ?? null;
  const T0 = a.state[0].T_K, p0 = a.state[0].p_o2_Pa;
  const parts: number[] = [];
  const rel = (x: number | null, y: number | null) => (x !== null && y !== null && Math.max(Math.abs(x), Math.abs(y)) > 0 ? Math.abs(x - y) / Math.max(Math.abs(x), Math.abs(y)) : 0);
  parts.push(rel((g(a, "peak_T") ?? T0) - T0, (g(b, "peak_T") ?? T0) - T0));
  parts.push(rel(p0 - (g(a, "min_o2") ?? p0), p0 - (g(b, "min_o2") ?? p0)));
  parts.push(rel(g(a, "peak_co"), g(b, "peak_co")), rel(g(a, "peak_co2"), g(b, "peak_co2")));
  return Math.max(...parts);
}
const rigFor = (param: string): { rig: string; inv: string[] } => {
  const sofie = INV.SoFIE, saf = INV["Saffire-IV-VI"];
  if (param === "gravity_g") return { rig: "No ISS rig flies partial gravity: needs a lunar-surface or partial-g platform experiment (outside PSI). Bound it meanwhile with µg (ISS) and 1 g ground tests of the same sample.", inv: ["PSI-99"] };
  if (param === "thickness_m" || param === "size") return { rig: `${saf?.name ?? "Saffire"} — ${saf?.hardware ?? "large-sample flow unit"}`, inv: ["PSI-98", "PSI-99", "PSI-100"] };
  return { rig: `${sofie?.name ?? "SoFIE"} (${sofie?.hardware ?? "SoFIE insert in CIR"}) — varies ${(sofie?.variables_varied ?? ["O2", "pressure", "flow"]).join(", ")}`, inv: ["PSI-25", "PSI-26"] };
};

export function nextTest(s: Scenario, r?: SimResult | null): NextTest | null {
  let base: SimResult;
  try { base = r ?? simulate(s); } catch { return null; }
  const m = MATERIALS.find((x) => x.material_key === s.items[0]?.material_key);
  const cands: { param: string; label: string; apply: (x: Scenario) => void; text: string }[] = [];
  const o2r = m?.o2_range ?? SOLID_ENVELOPE.x_o2;
  if (o2r && clamp(s.cabin.x_o2, o2r) !== s.cabin.x_o2)
    cands.push({ param: "x_o2", label: "O₂", apply: (x) => { x.cabin.x_o2 = clamp(s.cabin.x_o2, o2r); }, text: `O₂ ${(s.cabin.x_o2 * 100).toFixed(1)} % vs PSI-tested ${(o2r[0] * 100).toFixed(1)}–${(o2r[1] * 100).toFixed(1)} %` });
  const pr = SOLID_ENVELOPE.P_Pa;
  if (pr && clamp(s.cabin.P_Pa, pr) !== s.cabin.P_Pa)
    cands.push({ param: "P_Pa", label: "pressure", apply: (x) => { x.cabin.P_Pa = clamp(s.cabin.P_Pa, pr); }, text: `pressure ${(s.cabin.P_Pa / 1e3).toFixed(1)} kPa vs PSI-tested ${pr[0] / 1e3}–${pr[1] / 1e3} kPa` });
  const fr = m?.flow_range_m_s ?? SOLID_ENVELOPE.flow_m_s;
  if (fr && clamp(s.cabin.flow_m_s, fr) !== s.cabin.flow_m_s)
    cands.push({ param: "flow_m_s", label: "flow", apply: (x) => { x.cabin.flow_m_s = clamp(s.cabin.flow_m_s, fr); }, text: `flow ${(s.cabin.flow_m_s * 100).toFixed(1)} cm/s vs PSI-tested ${(fr[0] * 100).toFixed(1)}–${(fr[1] * 100).toFixed(1)} cm/s` });
  if (s.cabin.gravity_g > 0 && s.cabin.gravity_g < 1)
    cands.push({ param: "gravity_g", label: "gravity", apply: (x) => { x.cabin.gravity_g = 0; }, text: `${s.cabin.gravity_g} g (PSI: µg only; partial gravity is a bounded estimate)` });
  if (m?.thicknesses_m.length) {
    const lo = Math.min(...m.thicknesses_m), hi = Math.max(...m.thicknesses_m);
    const it = s.items[0];
    if (it && (it.thickness_m < lo * 0.999 || it.thickness_m > hi * 1.001))
      cands.push({ param: "thickness_m", label: "thickness", apply: (x) => { x.items[0].thickness_m = clamp(it.thickness_m, [lo, hi]); }, text: `${m.display_name} at ${(it.thickness_m * 1e3).toFixed(2)} mm vs tested ${(lo * 1e3).toFixed(2)}–${(hi * 1e3).toFixed(2)} mm` });
  }
  if (!cands.length) return null;
  const scored = cands.map((c) => {
    const x = clone(s); c.apply(x);
    let sh = 0;
    try { sh = shift(base, simulate(x)); } catch { sh = 0; }
    return { c, sh };
  }).sort((a, b) => b.sh - a.sh);
  const top = scored[0];
  const { rig, inv } = rigFor(top.c.param);
  return {
    param: top.c.param, condition: `Fly ${m?.display_name ?? "this material"} at ${top.c.text}`, shift: top.sh,
    why: `Moving ${top.c.label} back inside the tested envelope changes the predicted outcome by ${(top.sh * 100).toFixed(0)} % — the largest share of this result that rests on extrapolation${scored.length > 1 ? ` (next: ${scored[1].c.label}, ${(scored[1].sh * 100).toFixed(0)} %)` : ""}.`,
    rig, investigations: inv,
  };
}
