// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// The ONLY bridge from the engine trace to the 3D visuals. Pure: (scenario, result, frameIndex) → VisualState.
// Every fire/smoke/alarm/fan/agent visual reads this; no component computes physics. A fractional frameIndex
// linearly interpolates between two engine frames (smooth 60 fps playback); discrete fields use the lower frame.
import type { Scenario, SimResult } from "@/lib/sim/types";

export type GravityMode = "ug" | "partial" | "1g";

export interface ItemVisual {
  id: string;
  length_m: number; width_m: number; thickness_m: number;
  /** Pyrolysis front position from the item's leading edge (engine front_m). */
  front_m: number;
  /** Burning length = burning_area / width, capped by the front (engine). */
  burnLen_m: number;
  /** Charred (burnt-out) length = front − burning length. */
  charLen_m: number;
  status: "idle" | "burning" | "out";
  /** Flame drawn iff status is burning. */
  flamePresent: boolean;
  /** 0..1 residual flame scale during the 0.5 s (sim time) collapse after an `extinguished` event. */
  collapse: number;
  /** 0..1 smoulder glow, only after a burnout, fading over 3 s of sim time. */
  smoulder: number;
  extinguishReason?: "burnout" | "inerting" | "quench";
}

export interface VisualState {
  hasRun: boolean;
  frame: number; N: number; t: number; tEnd: number;
  items: ItemVisual[];
  /** Q_W / max(Q_W) over the run, 0..1. */
  qRatio: number;
  /** x_o2(t) / x_o2(0). */
  o2Ratio: number;
  /** Absolute cabin O₂ mole fraction at t (colour: high-O₂ flames are whiter and sootier). */
  x_o2: number;
  gravity_g: number; gravityMode: GravityMode;
  /** Flame shape factor g^(1/3): 0 = µg hemisphere, 1 = 1 g teardrop (buoyant-velocity scaling; partial g is bounded). */
  shape: number;
  /** Ventilation speed past the item (0 after fan-off), m/s, and a 0..1 lean factor. */
  flow_m_s: number; lean: number;
  fanOff: boolean; fanSpeed: number;
  /** Smoke emission/opacity 0..1 ∝ smoke_det / max(smoke_det); 0 when there is no data. */
  smoke: number; smokeNoData: boolean;
  alarm: boolean; tAlarm: number | null;
  agent: { kind: string; age_s: number; strength: number } | null;
  extinguished: boolean;
  limits: { label: string; source: string }[];
  theory: { spread: boolean; smoke: boolean };
  hud: { T_K: number | null; Q_W: number | null; x_o2: number | null; x_co_ppm: number | null };
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;

export function shapeFactor(g: number): number { return Math.cbrt(Math.max(0, Math.min(1, g))); }
export function gravityMode(g: number): GravityMode { return g <= 1e-6 ? "ug" : g >= 1 - 1e-6 ? "1g" : "partial"; }

/** Run-level maxima and event times, computed once per result. */
export function runSummary(r: SimResult) {
  let Qmax = 0, smokeMax = 0;
  for (const s of r.state) { if (s.Q_W > Qmax) Qmax = s.Q_W; if (s.smoke_det > smokeMax) smokeMax = s.smoke_det; }
  const ev = (k: string) => r.events.find((e) => e.kind === k)?.t_s ?? null;
  const noYield = r.warnings.some((w) => /no sourced smoke yield/i.test(w)) || !r.provenance.params.smoke && smokeMax <= 0;
  return { Qmax, smokeMax, noYield, tAlarm: ev("alarm"), tFanOff: ev("fan_off"), tAgent: ev("agent_released"), tExt: ev("extinguished") };
}

const AGENT_S = 2.5; // visual burst duration (sim seconds) after the engine's agent_released event
const COLLAPSE_S = 0.5, SMOULDER_S = 3;

export function visualState(sc: Scenario, r: SimResult | null, frameIndex: number): VisualState {
  const g = sc.cabin.gravity_g;
  const base = {
    gravity_g: g, gravityMode: gravityMode(g), shape: shapeFactor(g),
    theory: { spread: !!r && !!r.provenance.params.spread && !r.provenance.params.spread.calibrated, smoke: !!r && !!r.provenance.params.smoke && !r.provenance.params.smoke.calibrated },
  };
  if (!r || !r.t.length) {
    return {
      ...base, hasRun: false, frame: 0, N: 0, t: 0, tEnd: 0,
      items: sc.items.map((it) => ({ id: it.id, length_m: it.length_m, width_m: it.width_m, thickness_m: it.thickness_m, front_m: 0, burnLen_m: 0, charLen_m: 0, status: "idle", flamePresent: false, collapse: 0, smoulder: 0 })),
      qRatio: 0, o2Ratio: 1, x_o2: sc.cabin.x_o2, flow_m_s: sc.cabin.flow_m_s, lean: leanOf(sc.cabin.flow_m_s), fanOff: false, fanSpeed: sc.cabin.flow_m_s > 0 ? 1 : 0,
      smoke: 0, smokeNoData: false, alarm: false, tAlarm: null, agent: null, extinguished: false, limits: [],
      hud: { T_K: null, Q_W: null, x_o2: null, x_co_ppm: null },
    };
  }
  const N = r.t.length;
  const fi = Math.max(0, Math.min(N - 1, Number.isFinite(frameIndex) ? frameIndex : 0));
  const f0 = Math.floor(fi), f1 = Math.min(N - 1, f0 + 1), u = fi - f0;
  const t = lerp(r.t[f0], r.t[f1], u);
  const s0 = r.state[f0], s1 = r.state[f1];
  const S = runSummary(r);
  const Q = lerp(s0.Q_W, s1.Q_W, u);
  const xo2 = lerp(s0.x_o2, s1.x_o2, u);
  const x0 = r.state[0].x_o2 || sc.cabin.x_o2;
  const smokeDet = lerp(s0.smoke_det, s1.smoke_det, u);

  const at = (x: number | null) => x != null && t >= x - 1e-9;
  const fanOff = at(S.tFanOff);
  const flow = fanOff ? 0 : sc.cabin.flow_m_s;
  const fanSpeed = sc.cabin.flow_m_s <= 0 ? 0 : !fanOff ? 1 : clamp01(1 - (t - (S.tFanOff ?? t)) / 2);

  const items: ItemVisual[] = sc.items.map((it) => {
    const tr = r.items.find((x) => x.id === it.id);
    const status = tr?.status[f0] ?? "idle";
    const front = tr ? lerp(tr.front_m[f0], tr.front_m[f1], u) : 0;
    const area = tr ? lerp(tr.burning_area_m2[f0], tr.burning_area_m2[f1], u) : 0;
    const burnLen = status === "burning" ? Math.min(front, it.width_m > 0 ? area / it.width_m : 0) : 0;
    let collapse = 0, smoulder = 0;
    if (status === "out" && tr) {
      const iOut = tr.status.findIndex((s, i) => s === "out" && i > 0 && tr.status[i - 1] === "burning");
      const tOut = iOut >= 0 ? r.t[iOut] : null;
      const tExtItem = r.events.find((e) => e.kind === "extinguished" && (!e.item_id || e.item_id === it.id))?.t_s ?? tOut;
      if (tExtItem != null && t >= tExtItem) collapse = clamp01(1 - (t - tExtItem) / COLLAPSE_S);
      if (tr.extinguish_reason === "burnout" && tOut != null) smoulder = clamp01(1 - (t - tOut) / SMOULDER_S);
    }
    return {
      id: it.id, length_m: it.length_m, width_m: it.width_m, thickness_m: it.thickness_m,
      front_m: Math.max(0, Math.min(it.length_m, front)), burnLen_m: Math.max(0, burnLen), charLen_m: Math.max(0, Math.min(it.length_m, front) - burnLen),
      status, flamePresent: status === "burning", collapse, smoulder, extinguishReason: tr?.extinguish_reason,
    };
  });

  const agentAge = S.tAgent != null ? t - S.tAgent : -1;
  const agent = sc.suppression.agent !== "none" && S.tAgent != null && agentAge >= 0 && agentAge < AGENT_S
    ? { kind: sc.suppression.agent, age_s: agentAge, strength: clamp01(1 - agentAge / AGENT_S) } : null;

  const limits = r.events.filter((e) => e.kind === "limit_exceeded" && t >= e.t_s).map((e) => {
    const m = r.outcome.metrics.find((x) => x.pass === false && x.limit_source && e.detail.toLowerCase().includes(x.label.split(" ")[0].toLowerCase()));
    return { label: e.detail, source: m?.limit_source ?? r.outcome.metrics.find((x) => x.pass === false && x.limit_source)?.limit_source ?? "see Outputs" };
  });

  return {
    ...base, hasRun: true, frame: f0, N, t, tEnd: r.t[N - 1], items,
    qRatio: S.Qmax > 0 ? clamp01(Q / S.Qmax) : 0,
    o2Ratio: x0 > 0 ? Math.max(0, Math.min(1.5, xo2 / x0)) : 1, x_o2: xo2,
    flow_m_s: flow, lean: leanOf(flow), fanOff, fanSpeed,
    smoke: S.noYield || S.smokeMax <= 0 ? 0 : clamp01(smokeDet / S.smokeMax), smokeNoData: S.noYield,
    alarm: at(S.tAlarm), tAlarm: S.tAlarm, agent, extinguished: at(S.tExt), limits,
    hud: { T_K: lerp(s0.T_K, s1.T_K, u), Q_W: Q, x_o2: xo2, x_co_ppm: lerp(s0.x_co, s1.x_co, u) * 1e6 },
  };
}

/** Cosmetic lean (0..1) from the ventilation speed; saturates at 0.2 m/s. */
function leanOf(u: number) { return clamp01(u / 0.2); }
