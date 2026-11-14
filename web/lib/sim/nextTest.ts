// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Next test to fly: the scenario input that lies farthest outside the PSI-tested envelope (normalised distance).
// Inside the (tolerant) envelope there is nothing to propose: nextTest() returns null.
import investigationsJ from "@/data/investigations.json";
import { ENVELOPE_SCALE, MATERIALS, SOLID_ENVELOPE, insideRange, tolerantRange } from "./params";
import type { Scenario, SimResult } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface OutOfEnvelope { param: "x_o2" | "P_Pa" | "flow_m_s" | "gravity_g" | "thickness_m"; label: string; text: string; why: string; distance: number }
export interface NextTest { condition: string; why: string; rig: string; investigations: string[]; distance: number; param: string; label: string }
const INV = investigationsJ as Record<string, any>;
const pct = (x: number, d = 0) => `${(x * 100).toFixed(d)}%`;
const kPa = (x: number, d = 1) => `${(x / 1e3).toFixed(d)} kPa`;
const cms = (x: number, d = 0) => `${(x * 100).toFixed(d)} cm/s`;
const gText = (g: number) => (Math.abs(g - 1 / 6) < 0.01 ? "1/6 g" : Math.abs(g - 0.378) < 0.01 ? "Mars g" : `${g} g`);
/** "≤ 22%" for a one-point range, "16–22%" otherwise. */
const rangeText = (r: [number, number], f: (x: number) => string, degenerate: string) => (r[0] === r[1] ? `${degenerate}${f(r[0])}` : `${f(r[0])}–${f(r[1])}`);

/** Every scenario input outside the tolerant PSI envelope, farthest first. Empty = inside the envelope. */
export function outOfEnvelope(s: Scenario): OutOfEnvelope[] {
  const m = MATERIALS.find((x) => x.material_key === s.items[0]?.material_key);
  const name = m?.display_name ?? "this material";
  const out: OutOfEnvelope[] = [];
  const o2r = m?.o2_range ?? SOLID_ENVELOPE.x_o2;
  if (o2r && !insideRange(s.cabin.x_o2, tolerantRange(o2r, "x_o2"))) {
    const above = s.cabin.x_o2 > o2r[1];
    const edge = above ? o2r[1] : o2r[0];
    out.push({ param: "x_o2", label: "O₂", distance: Math.abs(s.cabin.x_o2 - edge) / ENVELOPE_SCALE.x_o2,
      text: `O₂ ${pct(s.cabin.x_o2)} vs tested ${above ? "≤ " : "≥ "}${pct(edge)}`,
      why: `x_O₂ ${pct(s.cabin.x_o2)} is ${((s.cabin.x_o2 - edge) * 100 * (above ? 1 : -1)).toFixed(0)} points ${above ? "above the highest" : "below the lowest"} PSI test of ${name} (${pct(edge)})` });
  }
  const pr = SOLID_ENVELOPE.P_Pa;
  if (pr && !insideRange(s.cabin.P_Pa, tolerantRange(pr, "P_Pa"))) {
    const above = s.cabin.P_Pa > pr[1];
    const edge = above ? pr[1] : pr[0];
    out.push({ param: "P_Pa", label: "pressure", distance: Math.abs(s.cabin.P_Pa - edge) / ENVELOPE_SCALE.P_Pa,
      text: `${kPa(s.cabin.P_Pa)} vs tested ${rangeText(pr, (x) => kPa(x, 0), "~")}`,
      why: `${kPa(s.cabin.P_Pa)} is ${kPa(Math.abs(s.cabin.P_Pa - edge))} ${above ? "above the highest" : "below the lowest"} PSI solid-fuel test (${kPa(edge, 0)})` });
  }
  const fr = m?.flow_range_m_s ?? SOLID_ENVELOPE.flow_m_s;
  if (fr && !insideRange(s.cabin.flow_m_s, tolerantRange(fr, "flow_m_s"))) {
    const above = s.cabin.flow_m_s > fr[1];
    const edge = above ? fr[1] : fr[0];
    out.push({ param: "flow_m_s", label: "flow", distance: Math.abs(s.cabin.flow_m_s - edge) / ENVELOPE_SCALE.flow_m_s,
      text: `flow ${cms(s.cabin.flow_m_s)} vs tested ${rangeText(fr, (x) => cms(x), above ? "≤ " : "≥ ")}`,
      why: `flow ${cms(s.cabin.flow_m_s, 1)} is ${above ? "above the fastest" : "below the slowest"} PSI test of ${name} (${cms(edge, 1)})` });
  }
  const g = s.cabin.gravity_g;
  if (g > 0 && g < 1) out.push({ param: "gravity_g", label: "gravity", distance: Math.min(g, 1 - g) / ENVELOPE_SCALE.gravity_g,
    text: `${gText(g)} bounded`, why: `${gText(g)}: PSI has no partial-gravity fire data; the result is bounded between µg (ISS) and 1 g ground tests` });
  if (m?.thicknesses_m.length) {
    const lo = Math.min(...m.thicknesses_m), hi = Math.max(...m.thicknesses_m);
    const it = s.items[0];
    if (it && (it.thickness_m < lo * 0.999 || it.thickness_m > hi * 1.001)) {
      const edge = it.thickness_m > hi ? hi : lo;
      out.push({ param: "thickness_m", label: "thickness", distance: Math.abs(it.thickness_m - edge) / Math.max(edge, 1e-6),
        text: `${(it.thickness_m * 1e3).toFixed(2)} mm vs tested ${(lo * 1e3).toFixed(2)}–${(hi * 1e3).toFixed(2)} mm`,
        why: `${name} at ${(it.thickness_m * 1e3).toFixed(2)} mm was never tested (PSI: ${(lo * 1e3).toFixed(2)}–${(hi * 1e3).toFixed(2)} mm)` });
    }
  }
  return out.sort((a, b) => b.distance - a.distance);
}

const rigFor = (param: string): { rig: string; inv: string[] } => {
  const sofie = INV.SoFIE, saf = INV["Saffire-IV-VI"];
  if (param === "gravity_g") return { rig: "No ISS rig flies partial gravity: needs a lunar-surface or partial-g platform experiment (outside PSI). Bound it meanwhile with µg (ISS) and 1 g ground tests of the same sample.", inv: ["PSI-99"] };
  if (param === "thickness_m") return { rig: `${saf?.name ?? "Saffire"} — ${saf?.hardware ?? "large-sample flow unit"}`, inv: ["PSI-98", "PSI-99", "PSI-100"] };
  return { rig: `${sofie?.name ?? "SoFIE"} (${sofie?.hardware ?? "SoFIE insert in CIR"}) — varies ${(sofie?.variables_varied ?? ["O2", "pressure", "flow"]).join(", ")}`, inv: ["PSI-25", "PSI-26"] };
};

/** The one test to fly next, or null when every input sits inside the tested envelope. `r` is accepted for API compatibility. */
export function nextTest(s: Scenario, _r?: SimResult | null): NextTest | null {
  const out = outOfEnvelope(s);
  if (!out.length) return null;
  const m = MATERIALS.find((x) => x.material_key === s.items[0]?.material_key);
  const top = out[0];
  const { rig, inv } = rigFor(top.param);
  const rest = out.slice(1).map((o) => o.text).join(" · ");
  return {
    param: top.param, label: top.label, distance: top.distance,
    condition: `Fly ${m?.display_name ?? "this material"} at ${top.text}`,
    why: `${top.why}: the input farthest outside the PSI envelope${rest ? ` (also outside: ${rest})` : ""}.`,
    rig, investigations: inv,
  };
}
