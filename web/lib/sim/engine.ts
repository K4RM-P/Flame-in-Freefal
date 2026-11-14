// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Cabin fire simulator: composes the existing physics modules (spread SP*, gravity GR*, habitat HA*, smoke SM*,
// suppression SU*) into one deterministic time-stepped run. No new physics: every rate comes from those modules and
// every property/limit from web/data. Single well-mixed zone (CFAST-like), 1D front per item, partial gravity bounded.
import { PROPS, fuel, prop, v, type Atm } from "@/lib/physics/data";
import * as G from "@/lib/physics/gravity";
import * as SM from "@/lib/physics/smoke";
import * as SP from "@/lib/physics/spread";
import * as SU from "@/lib/physics/suppression";
import { R, cpMolar, formulaMass, molarMass } from "@/lib/physics/thermo";
import { makeRng, percentiles, sampleDist, type Rng } from "@/lib/physics/uq";
import { HABITAT, LIMITS_SI, MATERIALS, SMOKE, SOLID_ENVELOPE, SPREAD, material, type Limit } from "./params";
import type { CabinState, Item, ItemTrace, Outcome, OutcomeMetric, Provenance, Scenario, SimBands, SimEvent, SimResult } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */
export const ENGINE_VERSION = "1.0.0";
export const DT = 0.5;
export const T_MAX = 600;
export const DEFAULT_SEED = 20261114;
const SP_NAMES = ["O2", "N2", "CO2", "H2O", "CO"] as const;

export class CabinVolumeRequired extends Error {
  code = "cabin_volume_required" as const;
  constructor() { super("cabin volume required: no sourced value for this cabin — enter V (m³)"); }
}

/** Per-run draws (nominal run = central values; MC run = sampled). */
export interface Draws {
  solid: Record<string, SP.SolidProps>; y_CO: Record<string, number>; dHc: Record<string, number>;
  h_w: number; chi: number; dH_O2: number; spread_scale: number; hA?: number;
}

function spreadParams(): SP.SpreadParams {
  const p = SPREAD.calibrated ? SPREAD.params : {};
  return { f_T: Number.isFinite(p.f_T) ? p.f_T : 1, mu: Number.isFinite(p.mu) ? p.mu : null, b: Number.isFinite(p.b) ? p.b : 1 };
}
function spreadScaleNominal(): number {
  const s = SPREAD.calibrated ? Number(SPREAD.params.scale ?? SPREAD.params.A) : NaN;
  return Number.isFinite(s) && s > 0 ? s : 1;
}
function massFlux(key: string): number | null {
  if (!SPREAD.calibrated) return null;
  const m = SPREAD.params.mass_flux_kg_m2_s;
  const val = typeof m === "object" && m ? Number(m[key]) : Number(m);
  return Number.isFinite(val) && val > 0 ? val : null;
}
/** Smoke (particulate) mass yield kg/kg: SAME-R/params calibration first, then a sourced fuel property; else null (no alarm). */
export function smokeYield(key: string): { y: number; source: string } | null {
  const p = SMOKE.params?.y_s ?? SMOKE.params?.y_smoke;
  const pv = typeof p === "object" && p ? Number(p[key]) : Number(p);
  if (SMOKE.calibrated && Number.isFinite(pv) && pv > 0) return { y: pv, source: SMOKE.sources.join(", ") || "params/smoke.json" };
  const f = PROPS.fuels?.[key];
  for (const k of ["y_soot", "y_smoke", "y_s"]) if (f?.[k]?.value > 0 && f[k].source) return { y: Number(f[k].value), source: f[k].source };
  return null;
}

export function nominalDraws(s: Scenario): Draws {
  const d: Draws = { solid: {}, y_CO: {}, dHc: {}, h_w: prop("habitat", "h_w"), chi: prop("habitat", "chi_r_lost"), dH_O2: prop("constants", "dH_O2"), spread_scale: spreadScaleNominal() };
  if (HABITAT.calibrated && Number.isFinite(HABITAT.params.hA_W_K)) d.hA = HABITAT.params.hA_W_K;
  if (HABITAT.calibrated && Number.isFinite(HABITAT.params.h_w)) d.h_w = HABITAT.params.h_w;
  for (const it of s.items) {
    const k = material(it.material_key).properties_key;
    if (!k || !PROPS.fuels?.[k]) continue;
    const f = fuel(k);
    d.solid[k] = {}; d.dHc[k] = v(f, "dHc"); d.y_CO[k] = v(f, "y_CO");
  }
  return d;
}
export function sampleDraws(s: Scenario, r: Rng): Draws {
  const d = nominalDraws(s);
  for (const k of Object.keys(d.solid)) {
    const f = fuel(k);
    const sp: SP.SolidProps = {};
    for (const q of ["T_v", "c_s", "k_s", "dHc"] as const) if (f[q]?.dist) sp[q] = sampleDist(r, v(f, q), f[q].dist);
    d.solid[k] = sp; d.dHc[k] = sp.dHc ?? v(f, "dHc");
    d.y_CO[k] = f.y_CO?.dist ? sampleDist(r, v(f, "y_CO"), f.y_CO.dist) : v(f, "y_CO");
  }
  const hp = PROPS.habitat;
  if (d.hA !== undefined) { const sd = HABITAT.param_sd.hA_W_K; if (sd) d.hA = Math.max(0, r.normal(d.hA, sd)); }
  else if (HABITAT.calibrated && Number.isFinite(HABITAT.params.h_w)) { const sd = HABITAT.param_sd.h_w; if (sd) d.h_w = Math.max(0, r.normal(d.h_w, sd)); }
  else if (hp?.h_w?.dist) d.h_w = sampleDist(r, hp.h_w.value, hp.h_w.dist);
  if (hp?.chi_r_lost?.dist) d.chi = sampleDist(r, hp.chi_r_lost.value, hp.chi_r_lost.dist);
  const dh = PROPS.constants?.dH_O2;
  if (dh?.dist) d.dH_O2 = sampleDist(r, dh.value, dh.dist);
  const ls = SPREAD.calibrated ? SPREAD.param_sd.ln_scale ?? SPREAD.param_sd.ln_A : undefined;
  if (ls) d.spread_scale *= Math.exp(r.normal(0, ls));
  return d;
}

interface ItemRun {
  it: Item; key: string | null; status: "idle" | "burning" | "out"; front: number; reason?: ItemTrace["extinguish_reason"];
  cacheKey: string; cacheV: number; cacheTad: number; trace: ItemTrace; areal: number; mdot: number;
}

/** Tcrit for the inerting check: µg-calibrated value if the fuel has one, else the 1 g cup-burner reference (labelled). */
function tCrit(key: string): { T: number; basis: string } {
  const ug = SU.tCritUg(key);
  return ug !== null ? { T: ug, basis: "µg-calibrated T_crit" } : { T: SU.tCrit1g(prop("constants", "T_amb")), basis: "1 g cup-burner T_crit reference (no µg calibration for this material)" };
}

export interface SimOptions { mc?: number; seed?: number; draws?: Draws; collectBandsFor?: (keyof CabinState)[] }

/** Deterministic single run (nominal draws unless `draws` given). */
export function simulate(scenario: Scenario, opts: SimOptions = {}): SimResult {
  const base = runOnce(scenario, opts.draws ?? nominalDraws(scenario), opts.seed ?? DEFAULT_SEED);
  if (opts.mc && opts.mc > 1) return attachMC(base, scenario, opts.mc, opts.seed ?? DEFAULT_SEED);
  return base;
}
export const simulateMC = (scenario: Scenario, n = 200, seed = DEFAULT_SEED) => simulate(scenario, { mc: n, seed });

function runOnce(s: Scenario, d: Draws, seed: number): SimResult {
  const c = s.cabin;
  if (c.V_m3 === null || !(c.V_m3 > 0)) throw new CabinVolumeRequired();
  const V = c.V_m3;
  const T_amb = prop("constants", "T_amb");
  const T_w = prop("habitat", "T_wall");
  const hA = d.hA ?? d.h_w * prop("habitat", "wall_area_factor") * V ** (2 / 3);
  const tEnd = Math.min(s.t_end_s ?? T_MAX, T_MAX);
  const nSteps = Math.round(tEnd / DT);
  const warnings: string[] = [];
  const events: SimEvent[] = [];
  const sources: Provenance[] = [];

  // state: T, n_O2, n_N2, n_CO2, n_H2O, n_CO (mol)
  const n0 = (c.P_Pa * V) / (R * T_amb);
  let y = [T_amb, n0 * c.x_o2, n0 * (1 - c.x_o2), 0, 0, 0];
  const M = Object.fromEntries(SP_NAMES.map((k) => [k, molarMass(k)])) as Record<string, number>;

  const runs: ItemRun[] = s.items.map((it) => {
    const m = material(it.material_key);
    const key = m.ignitable ? m.properties_key : null;
    if (!m.ignitable && it.ignite) warnings.push(`${m.display_name}: no PSI burn data with spread properties — smoke source only, cannot ignite in the simulator.`);
    const areal = key ? SP.solidProps(key, it.thickness_m, d.solid[key] ?? {}).areal : 0;
    return { it, key, status: "idle", front: 0, cacheKey: "", cacheV: 0, cacheTad: 0, areal, mdot: 0,
      trace: { id: it.id, burning_area_m2: [], front_m: [], status: [] } };
  });
  if (s.items.some((i) => !i.ignite)) warnings.push("Items without their own ignition source never ignite: item-to-item fire spread is not modelled.");

  // detector
  const det = s.detection;
  const yieldBy: Record<string, { y: number; source: string } | null> = {};
  for (const r of runs) if (r.key) yieldBy[r.key] = smokeYield(r.key);
  if (runs.some((r) => r.key && !yieldBy[r.key])) warnings.push("No sourced smoke yield for at least one burning material: its smoke is not counted at the detector.");
  if (det.threshold === null) warnings.push("Detector threshold has no sourced value — enter one (kg/m³ smoke at the detector); alarm not computed.");
  const smokeHist: number[] = []; // cabin smoke mass (kg) per step
  let smokeMass = 0;
  let flow = c.flow_m_s;
  let tAlarm: number | null = null, tFanOff: number | null = null, tAgent: number | null = null;
  const limitHit = new Set<string>();
  const t: number[] = [], state: CabinState[] = [];
  const tc: Record<string, { T: number; basis: string }> = {};

  const sp = spreadParams();
  const quench = (Veq: number) => SP.quenchWarning(Veq);
  // Spread/gravity need transport data; species without it (trace CO) are dropped and the rest renormalised.
  const kSp = PROPS.transport?.k_species ?? {};
  const transportAtm = (x: Atm): Atm => {
    const keep = Object.entries(x).filter(([k, v0]) => kSp[k] && v0 > 0);
    const tot = keep.reduce((a, [, v0]) => a + v0, 0);
    return Object.fromEntries(keep.map(([k, v0]) => [k, v0 / tot]));
  };
  const atmOf = (yy: number[]): Atm => {
    const nt = yy[1] + yy[2] + yy[3] + yy[4] + yy[5];
    return { O2: yy[1] / nt, N2: yy[2] / nt, CO2: yy[3] / nt, H2O: yy[4] / nt, CO: yy[5] / nt };
  };

  const record = (time: number, Q: number, area: number, det_c: number) => {
    const [T, nO2, nN2, nCO2, nH2O, nCO] = y;
    const nt = nO2 + nN2 + nCO2 + nH2O + nCO;
    const P = (nt * R * T) / V;
    const massO2 = nO2 * M.O2, massTot = nO2 * M.O2 + nN2 * M.N2 + nCO2 * M.CO2 + nH2O * M.H2O + nCO * M.CO;
    t.push(time);
    state.push({ T_K: T, P_Pa: P, x_o2: nO2 / nt, p_o2_Pa: (nO2 / nt) * P, y_o2: massO2 / massTot, x_co2: nCO2 / nt, x_co: nCO / nt, smoke_det: det_c, Q_W: Q, burning_area_m2: area });
    for (const r of runs) { r.trace.burning_area_m2.push(r.status === "burning" ? burningArea(r) : 0); r.trace.front_m.push(r.front); r.trace.status.push(r.status); }
  };
  const burningArea = (r: ItemRun) => {
    const mf = r.key ? massFlux(r.key) : null;
    return mf ? Math.min(r.mdot / mf, r.it.width_m * r.front) : r.it.width_m * r.front; // swept area when m'' is not calibrated
  };

  record(0, 0, 0, 0);
  for (let k = 1; k <= nSteps; k++) {
    const time = k * DT;
    const tPrev = time - DT;
    const x = atmOf(y);
    const P = ((y[1] + y[2] + y[3] + y[4] + y[5]) * R * y[0]) / V;
    const T = y[0];

    // (a) ignition, spread, extinction
    let Q = 0, area = 0;
    const mF: { key: string; mdot: number }[] = [];
    for (const r of runs) {
      if (r.status === "idle" && r.it.ignite && tPrev >= r.it.t_ignite_s - 1e-9) {
        if (!r.key) { r.status = "out"; continue; }
        r.status = "burning";
        events.push({ t_s: tPrev, kind: "ignition", item_id: r.it.id, detail: `${material(r.it.material_key).display_name} ignited` });
      }
      if (r.status !== "burning" || !r.key) { r.mdot = 0; continue; }
      const key = r.key;
      const ck = `${x.O2.toFixed(5)}|${(P / 100).toFixed(0)}|${T.toFixed(1)}|${flow.toFixed(4)}`;
      if (ck !== r.cacheKey) {
        const xt = transportAtm(x);
        const r0 = SP.spreadRate(key, xt, P, flow, T, r.it.thickness_m, sp, d.solid[key]);
        const ub = c.gravity_g > 0 ? G.buoyantVelocity(c.gravity_g, xt, P, r0.T_f, T) : 0;
        const Veq = G.equivalentFlow(flow, ub, "opposed");
        const rr = ub > 0 ? SP.spreadRate(key, xt, P, Veq, T, r.it.thickness_m, sp, d.solid[key]) : r0;
        tc[key] ??= tCrit(key);
        r.cacheTad = SU.tAd(key, x, T, d.dH_O2);
        r.cacheV = quench(Veq) ? -1 : rr.V_f * d.spread_scale;
        r.cacheKey = ck;
      }
      if (r.cacheTad < tc[key].T) { extinguish(r, tPrev, "inerting", `T_ad ${r.cacheTad.toFixed(0)} K below ${tc[key].basis} ${tc[key].T.toFixed(0)} K`); continue; }
      if (r.cacheV < 0) { extinguish(r, tPrev, "quench", "equivalent flow below the low-flow quench limit"); continue; }
      if (y[1] <= 0) { extinguish(r, tPrev, "inerting", "cabin O₂ exhausted"); continue; }
      const Vf = r.cacheV;
      r.front = Math.min(r.it.length_m, r.front + Vf * DT);
      r.mdot = r.areal * r.it.width_m * Vf; // thin-fuel consumption at the front (= burning area × mass flux in steady spread)
      Q += r.mdot * d.dHc[key];
      area += burningArea(r);
      mF.push({ key, mdot: r.mdot });
      if (r.front >= r.it.length_m - 1e-12) extinguish(r, time, "burnout", "flame front reached the end of the item");
    }

    // (c) cabin ODE over [tPrev, time] with Q held (RK4, 4 sub-steps)
    const rhs = (yy: number[]): number[] => {
      const [Tg, nO2, nN2, nCO2, nH2O, nCO] = yy;
      const q = nO2 > 0 ? Q : 0;
      const ns = [nO2, nN2, nCO2, nH2O, nCO];
      let cv = 0;
      for (let i = 0; i < 5; i++) cv += ns[i] * (cpMolar(SP_NAMES[i], Tg) - R);
      let dCO2 = 0, dH2O = 0, dCO = 0;
      if (q > 0) for (const f of mF) {
        const form = fuel(f.key).formula, MF = formulaMass(form);
        const co = (d.y_CO[f.key] * f.mdot) / M.CO;
        dCO += co; dCO2 += ((form.C ?? 0) * f.mdot) / MF - co; dH2O += (((form.H ?? 0) / 2) * f.mdot) / MF;
      }
      return [((1 - d.chi) * q - hA * (Tg - T_w)) / cv, -q / (d.dH_O2 * M.O2), 0, dCO2, dH2O, dCO];
    };
    const h = DT / 4;
    for (let sub = 0; sub < 4; sub++) {
      const k1 = rhs(y), k2 = rhs(y.map((v0, j) => v0 + 0.5 * h * k1[j])), k3 = rhs(y.map((v0, j) => v0 + 0.5 * h * k2[j])), k4 = rhs(y.map((v0, j) => v0 + h * k3[j]));
      y = y.map((v0, j) => v0 + (h / 6) * (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j]));
    }
    y[1] = Math.max(0, y[1]);

    // (d) smoke: well-mixed cabin smoke mass, seen at the detector after transport delay τ = distance / flow
    for (const f of mF) { const ys = yieldBy[f.key]; if (ys) smokeMass += ys.y * f.mdot * DT; }
    smokeHist.push(smokeMass);
    let detC = 0;
    if (flow > 0) {
      const tau = det.distance_m / flow;
      const lag = Math.round(tau / DT);
      const idx = smokeHist.length - 1 - lag;
      const m = idx >= 0 ? smokeHist[idx] : 0;
      let survive = 1;
      if (c.gravity_g > 0 && m > 0) {
        const p0 = SMOKE.calibrated ? SMOKE.params : {};
        const N0 = Number.isFinite(p0.N0) ? p0.N0 : prop("smoke", "N0_default");
        const d0 = (Number.isFinite(p0.d0_nm) ? p0.d0_nm : prop("smoke", "d0_default_nm")) * 1e-9;
        const a = SM.age(tau, N0, d0, y[0], P);
        survive = Math.exp(-(SM.settlingVelocity(a.d43, c.gravity_g, y[0], P) * tau) / V ** (1 / 3)); // geometric assumption: fall height V^(1/3)
      }
      detC = (m / V) * survive;
    } else if (tFanOff !== null && smokeHist.length > 1) {
      detC = state[state.length - 1].smoke_det; // no transport after fan-off: detector reading frozen
    }

    // (e) alarm → fan off → agent
    const detHit = det.threshold !== null && detC >= det.threshold;
    const manual = det.manual_alarm_s != null && time >= det.manual_alarm_s - 1e-9;
    if (tAlarm === null && (detHit || manual)) {
      tAlarm = time;
      events.push({ t_s: time, kind: "alarm", detail: detHit ? `${det.type} detector at ${det.distance_m} m crossed ${det.threshold} kg/m³` : "crew-reported alarm (design input)" });
      if (c.fan_off_on_alarm) { tFanOff = time; flow = 0; events.push({ t_s: time, kind: "fan_off", detail: "ventilation stopped on alarm" }); }
    }
    if (tAlarm !== null && tAgent === null && s.suppression.agent !== "none" && s.suppression.mass_kg > 0 && time >= tAlarm + s.suppression.delay_s - 1e-9) {
      tAgent = time;
      const ag = s.suppression.agent;
      const nAg = s.suppression.mass_kg / molarMass(ag);
      y[ag === "CO2" ? 3 : 2] += nAg; // instant well-mixed release (single zone)
      events.push({ t_s: time, kind: "agent_released", detail: `${s.suppression.mass_kg} kg ${ag} released (${(nAg).toFixed(1)} mol)` });
    }

    record(time, Q, area, detC);
    // (g) limits
    const st = state[state.length - 1];
    for (const l of LIMITS_SI) {
      if (limitHit.has(l.key)) continue;
      const hit = l.key === "co" ? st.x_co >= l.value : l.key === "co2" ? st.x_co2 >= l.value : st.p_o2_Pa <= l.value;
      if (hit) { limitHit.add(l.key); events.push({ t_s: time, kind: "limit_exceeded", detail: `${l.label} (${l.source})` }); }
    }
  }

  function extinguish(r: ItemRun, time: number, reason: NonNullable<ItemTrace["extinguish_reason"]>, detail: string) {
    r.status = "out"; r.reason = reason; r.trace.extinguish_reason = reason; r.mdot = 0;
    events.push({ t_s: time, kind: "extinguished", item_id: r.it.id, detail: `${reason}: ${detail}` });
  }

  // warnings / provenance
  warnings.push(...envelopeWarnings(s));
  for (const [k, pfile] of [["spread", SPREAD], ["habitat", HABITAT], ["smoke", SMOKE]] as const)
    if (!pfile.calibrated) warnings.push(`${k} sub-model is theory-only (not calibrated on PSI data).`);
  for (const [k, b] of Object.entries(tc)) if (!b.basis.startsWith("µg")) warnings.push(`${k}: inerting check uses the ${b.basis}.`);
  for (const r of runs) if (r.key) sources.push(...material(r.it.material_key).sources);
  for (const l of LIMITS_SI) sources.push({ source_id: l.source, locator: l.locator, note: l.label });
  sources.push(...SPREAD.sources.map((x) => ({ source_id: x, note: "spread calibration" })), ...HABITAT.sources.map((x) => ({ source_id: x, note: "cabin heat loss calibration" })), ...SMOKE.sources.map((x) => ({ source_id: x, note: "smoke calibration" })));

  const res: SimResult = {
    t, state, events, items: runs.map((r) => r.trace), warnings: [...new Set(warnings)], outcome: { metrics: [] },
    provenance: {
      sources: dedupe(sources), seed, engine_version: ENGINE_VERSION,
      params: {
        spread: { calibrated: SPREAD.calibrated, source: SPREAD.calibrated ? SPREAD.sources.join(", ") : "theory only: de Ris + Burke–Schumann (properties.json)" },
        habitat: { calibrated: HABITAT.calibrated, source: HABITAT.calibrated ? HABITAT.sources.join(", ") : `theory only: h_w prior (${PROPS.habitat?.h_w?.source})` },
        smoke: { calibrated: SMOKE.calibrated, source: SMOKE.calibrated ? SMOKE.sources.join(", ") : "theory only: Smoluchowski coagulation (properties.json smoke)" },
      },
    },
  };
  res.outcome = outcomeOf(res);
  return res;
}

function dedupe(p: Provenance[]): Provenance[] {
  const seen = new Set<string>();
  return p.filter((x) => { const k = `${x.source_id}|${x.locator ?? ""}`; if (!x.source_id || seen.has(k)) return false; seen.add(k); return true; });
}

// ---------- outcome ----------
const lim = (k: Limit["key"]) => LIMITS_SI.find((l) => l.key === k);
export function outcomeOf(r: SimResult): Outcome {
  const ev = (k: string) => r.events.find((e) => e.kind === k);
  const ign = r.items.some((i) => i.status.includes("burning"));
  const allOut = ign && r.items.every((i) => !i.status.includes("burning") || i.status[i.status.length - 1] === "out");
  const lastOut = r.events.filter((e) => e.kind === "extinguished").reduce((m, e) => Math.max(m, e.t_s), -Infinity);
  const peak = (f: (s: CabinState) => number) => r.state.reduce((m, s) => Math.max(m, f(s)), -Infinity);
  const minv = (f: (s: CabinState) => number) => r.state.reduce((m, s) => Math.min(m, f(s)), Infinity);
  const co = lim("co"), co2 = lim("co2"), o2 = lim("o2_min");
  const m = (key: string, label: string, value: number | null, units: string, l?: Limit, dir: "max" | "min" = "max"): OutcomeMetric => ({
    key, label, value, units, limit: l?.value, limit_source: l ? `${l.source}${l.locator ? ` — ${l.locator}` : ""}${l.status && l.status !== "ok" ? ` [${l.status}]` : ""}` : undefined,
    pass: l && value !== null ? (dir === "max" ? value < l.value : value > l.value) : null,
  });
  return {
    metrics: [
      m("time_to_alarm", "Time to alarm", ev("alarm")?.t_s ?? null, "s"),
      m("time_to_extinguish", "Time to extinguish", allOut ? lastOut : null, "s"),
      m("peak_T", "Peak cabin temperature", peak((s) => s.T_K), "K"),
      m("min_o2", "Minimum O₂ partial pressure", minv((s) => s.p_o2_Pa), "Pa", o2, "min"),
      m("peak_co", "Peak CO", peak((s) => s.x_co), "mol/mol", co),
      m("peak_co2", "Peak CO₂", peak((s) => s.x_co2), "mol/mol", co2),
    ],
  };
}

// ---------- Monte Carlo ----------
const FIELDS: (keyof CabinState)[] = ["T_K", "P_Pa", "x_o2", "p_o2_Pa", "y_o2", "x_co2", "x_co", "smoke_det", "Q_W", "burning_area_m2"];
function attachMC(base: SimResult, s: Scenario, n: number, seed: number): SimResult {
  const rng = makeRng(seed);
  const runs: SimResult[] = [];
  for (let i = 0; i < n; i++) { try { runs.push(runOnce(s, sampleDraws(s, rng), seed)); } catch (e) { if (e instanceof CabinVolumeRequired) throw e; } }
  const bands: SimBands = {};
  for (const f of FIELDS) {
    const b = { p05: [] as number[], p50: [] as number[], p95: [] as number[] };
    for (let j = 0; j < base.t.length; j++) {
      const q = percentiles(runs.map((r) => r.state[j]?.[f]));
      b.p05.push(q.p05); b.p50.push(q.p50); b.p95.push(q.p95);
    }
    bands[f] = b;
  }
  const metrics = base.outcome.metrics.map((mm) => {
    const vals = runs.map((r) => r.outcome.metrics.find((x) => x.key === mm.key)?.value ?? null);
    const finite = vals.filter((x): x is number => x !== null);
    return finite.length ? { ...mm, band: percentiles(finite) } : mm;
  });
  const frac = (f: (r: SimResult) => boolean) => runs.length ? runs.filter(f).length / runs.length : NaN;
  const probabilities: NonNullable<Outcome["probabilities"]> = [];
  for (const l of LIMITS_SI) probabilities.push({ key: `limit_${l.key}`, label: l.key === "o2_min" ? `ppO₂ below ${l.label.toLowerCase()}` : `${l.label} exceeded`, p: frac((r) => r.events.some((e) => e.kind === "limit_exceeded" && e.detail.startsWith(l.label))) });
  probabilities.push({ key: "alarm", label: "Detector alarms", p: frac((r) => r.events.some((e) => e.kind === "alarm")) });
  probabilities.push({ key: "extinguished", label: `All fires out before ${base.t[base.t.length - 1]} s`, p: frac((r) => r.outcome.metrics.find((x) => x.key === "time_to_extinguish")?.value !== null) });
  return { ...base, bands, outcome: { metrics, probabilities }, provenance: { ...base.provenance, sources: base.provenance.sources }, warnings: [...base.warnings, `Monte Carlo: ${runs.length} runs (seed ${seed}); bands = property and parameter uncertainty only, not model-form error.`] };
}

// ---------- envelope ----------
export function envelopeWarnings(s: Scenario): string[] {
  const w: string[] = [];
  const g = s.cabin.gravity_g;
  if (g > 0 && g < 1) w.push(`Partial gravity (${g} g) is a bounded estimate (µg ↔ 1 g): PSI has no partial-gravity fire data.`);
  for (const it of s.items) {
    const m = MATERIALS.find((x) => x.material_key === it.material_key);
    if (!m) continue;
    if (m.o2_range && (s.cabin.x_o2 < m.o2_range[0] - 1e-9 || s.cabin.x_o2 > m.o2_range[1] + 1e-9))
      w.push(`${m.display_name}: O₂ ${(s.cabin.x_o2 * 100).toFixed(1)} % is outside its PSI test range ${(m.o2_range[0] * 100).toFixed(1)}–${(m.o2_range[1] * 100).toFixed(1)} %.`);
    if (m.flow_range_m_s && (s.cabin.flow_m_s < m.flow_range_m_s[0] - 1e-9 || s.cabin.flow_m_s > m.flow_range_m_s[1] + 1e-9))
      w.push(`${m.display_name}: flow ${(s.cabin.flow_m_s * 100).toFixed(1)} cm/s is outside its PSI test range ${(m.flow_range_m_s[0] * 100).toFixed(1)}–${(m.flow_range_m_s[1] * 100).toFixed(1)} cm/s.`);
    if (m.thicknesses_m.length) {
      const lo = Math.min(...m.thicknesses_m), hi = Math.max(...m.thicknesses_m);
      if (it.thickness_m < lo * 0.999 || it.thickness_m > hi * 1.001) w.push(`${m.display_name}: thickness ${(it.thickness_m * 1e3).toFixed(2)} mm is outside the tested ${(lo * 1e3).toFixed(2)}–${(hi * 1e3).toFixed(2)} mm.`);
    }
  }
  const pr = SOLID_ENVELOPE.P_Pa;
  if (pr && (s.cabin.P_Pa < pr[0] * 0.99 || s.cabin.P_Pa > pr[1] * 1.01))
    w.push(`Pressure ${(s.cabin.P_Pa / 1e3).toFixed(1)} kPa is outside the PSI solid-fuel test range ${pr[0] / 1e3}–${pr[1] / 1e3} kPa (${SOLID_ENVELOPE.sources.join(", ")}).`);
  return w;
}
