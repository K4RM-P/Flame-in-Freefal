// TS ModelResult layer (mirrors emberphys/models.py). Physics values are golden-vector-checked; MC bands use mulberry32.
import { DROPLET_PARAMS, PROPS, SUPPRESSION_PARAMS, fuel, prop, v, type Atm } from "./data";
import * as D from "./droplet";
import * as G from "./gravity";
import * as H from "./habitat";
import * as SM from "./smoke";
import * as SP from "./spread";
import * as SU from "./suppression";
import { flameTemperature } from "./flameTemp";
import { atmosphere } from "./thermo";
import { monteCarlo, makeRng, percentiles, sampleDist, type Band } from "./uq";

export const T_AMB = prop("constants", "T_amb");
export const CAVEAT_G = "PSI contains microgravity and 1 g data only; partial-gravity values are bounded estimates.";

export interface Validity { in_envelope: boolean; nearest_data_distance: number | null; calibrated: boolean; note?: string; quench_warning?: boolean }
export interface ModelResult {
  model_id: string; value: number; units: string; uncertainty: Band; inputs: Record<string, unknown>;
  equation_ids: string[]; assumptions: string[]; validity: Validity; sources: string[]; extra: Record<string, unknown>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function envelopeCheck(env: any, x: Record<string, number>): Pick<Validity, "in_envelope" | "nearest_data_distance"> {
  if (!env) return { in_envelope: false, nearest_data_distance: null };
  const f: string[] = env.features;
  const xv = f.map((k) => x[k]);
  const inside = xv.every((val, i) => val >= env.min[i] - 1e-12 && val <= env.max[i] + 1e-12);
  const z = xv.map((val, i) => (val - env.mean[i]) / env.std[i]);
  let best = Infinity;
  for (const pt of env.points as number[][]) {
    const dd = Math.hypot(...pt.map((pv, i) => (pv - env.mean[i]) / env.std[i] - z[i]));
    if (dd < best) best = dd;
  }
  return { in_envelope: inside, nearest_data_distance: best };
}

export function runDroplet(fuelName: string, x_o2: number, P_kPa: number, d0_mm: number, diluent = "N2", x_dil = 0, nMc = 500): ModelResult {
  const x = atmosphere(x_o2, diluent, x_dil);
  const P = P_kPa * 1e3;
  const fp = DROPLET_PARAMS?.fuels?.[fuelName];
  const p = D.paramsFor(fuelName);
  const st = D.state(fuelName, x, P, T_AMB, p);
  const [dd, dr] = D.extinctionDiameters(fuelName, x, P, T_AMB, p);
  const f = fuel(fuelName);
  const unc = monteCarlo((r) => {
    const props = { dHc: sampleDist(r, v(f, "dHc"), f.dHc.dist), h_fg: sampleDist(r, v(f, "h_fg"), f.h_fg.dist) };
    const q = { ...p, f_k: fp ? p.f_k * Math.exp(r.normal(0, fp.param_sd.ln_f_k)) : p.f_k };
    return D.state(fuelName, x, P, T_AMB, q, props).K * 1e6;
  }, nMc);
  const d0 = d0_mm * 1e-3;
  const burning = dd !== null && (dr === null || d0 < dr) && d0 > dd;
  return {
    model_id: "droplet", value: st.K * 1e6, units: "mm²/s", uncertainty: unc,
    inputs: { fuel: fuelName, x_o2, P_kPa, p_o2_kPa: x_o2 * P_kPa, d0_mm, diluent, x_diluent: x_dil },
    equation_ids: D.EQ,
    assumptions: ["quasi-steady d²-law, spherically symmetric (microgravity, no convection)",
      "film rule T̄ = (T_boil + T_f)/2 with fitted conductivity factor f_k",
      "optically thin radiation from a hot shell ∝ r_f³; one-step Arrhenius kinetics",
      "no fuel-vapour accumulation, soot dynamics or cool-flame chemistry"],
    validity: { ...envelopeCheck(fp?.envelope, { x_o2, pressure_kpa: P_kPa, d0_mm }), calibrated: !!fp },
    sources: ["turns", "chao-law-tien-1990", "ntrs-20150023456", "dietrich-2014", "westbrook-dryer-1981"],
    extra: { B: st.B, standoff_ratio: st.standoff, T_f0_K: st.T_f0, d_ext_diffusive_mm: dd ? dd * 1e3 : null,
      d_ext_radiative_mm: dr ? dr * 1e3 : null, sustained_burning_predicted: burning,
      cool_flame_possible: fuelName.startsWith("n-") && dr !== null && d0 >= dr,
      burn_time_s: burning ? (d0_mm ** 2 - (dd ? dd * 1e3 : 0) ** 2) / (st.K * 1e6) : null },
  };
}

export function runSuppression(fuelName: string, x_o2: number, P_kPa: number, agent = "CO2", nMc = 300): ModelResult {
  const base: Atm = { O2: x_o2, N2: 1 - x_o2 };
  const tcUg = SU.tCritUg(fuelName);
  const tc1 = SU.tCrit1g(T_AMB);
  const x1 = SU.agentFraction(fuelName, base, agent, tc1, T_AMB);
  const xu = tcUg !== null ? SU.agentFraction(fuelName, base, agent, tcUg, T_AMB) : null;
  const mec = PROPS.suppression.cup_burner_N2_MEC_heptane, dH = PROPS.constants.dH_O2;
  const sd = SUPPRESSION_PARAMS?.fuels?.[fuelName]?.T_crit_ug_sd ?? 0;
  const unc = monteCarlo((r) => {
    const tc = tcUg !== null ? r.normal(tcUg, sd) : SU.tCrit1g(T_AMB, sampleDist(r, mec.value, mec.dist));
    return SU.agentFraction(fuelName, base, agent, tc, T_AMB, sampleDist(r, dH.value, dH.dist));
  }, nMc);
  const unc1 = monteCarlo((r) => SU.agentFraction(fuelName, base, agent, SU.tCrit1g(T_AMB, sampleDist(r, mec.value, mec.dist)), T_AMB, sampleDist(r, dH.value, dH.dist)), nMc);
  return {
    model_id: "suppression", value: xu ?? x1, units: "agent mole fraction", uncertainty: unc,
    inputs: { fuel: fuelName, x_o2, P_kPa, p_o2_kPa: x_o2 * P_kPa, agent },
    equation_ids: SU.EQ,
    assumptions: ["pure thermal theory: stoichiometric adiabatic flame temperature must stay above T_crit",
      "agent dispersed into the base atmosphere (x_i = x_i,base (1 − x_agent))",
      "no chemical inhibition, no CO₂ radiation re-absorption, unity Lewis number (He effect not captured)",
      "T_crit,µg fitted per fuel to FLEX O₂/N₂ droplet LOIs (1 atm); 1 g reference from heptane cup-burner N₂ MEC"],
    validity: { in_envelope: Math.abs(P_kPa - 101.3) < 35 && tcUg !== null, nearest_data_distance: null, calibrated: tcUg !== null },
    sources: ["sfpe-beyler", "nfpa-2001", "huggett-1980", "gri30", "dietrich-2014"],
    extra: { x_agent_1g: x1, x_agent_ug: xu, uncertainty_1g: unc1, T_crit_1g_K: tc1, T_crit_ug_K: tcUg,
      T_ad_base_K: SU.tAd(fuelName, base, T_AMB), o2_at_extinction_ug: xu !== null ? x_o2 * (1 - xu) : null,
      ug_margin: xu !== null ? xu - x1 : null },
  };
}

export function runSpread(material: string, x_o2: number, P_kPa: number, flow_cm_s: number, thickness_mm: number | null = null,
  gravity_g = 0, orientation: "opposed" | "cross" = "opposed", nMc = 500): ModelResult {
  const x = atmosphere(x_o2);
  const P = P_kPa * 1e3;
  const th = thickness_mm !== null ? thickness_mm * 1e-3 : null;
  const r = SP.spreadRate(material, x, P, flow_cm_s / 100, T_AMB, th);
  const ub = gravity_g > 0 ? G.buoyantVelocity(gravity_g, x, P, r.T_f, T_AMB) : 0;
  const Veq = G.equivalentFlow(flow_cm_s / 100, ub, orientation);
  const req = SP.spreadRate(material, x, P, Veq, T_AMB, th);
  const f = fuel(material);
  const unc = monteCarlo((rng) => {
    const props: SP.SolidProps = {};
    for (const k of ["T_v", "c_s", "k_s", "dHc"] as const) if (f[k]) props[k] = sampleDist(rng, v(f, k), f[k].dist);
    return SP.spreadRate(material, x, P, Veq, T_AMB, th, SP.defaultSpreadParams(), props).V_f * 1e3;
  }, nMc);
  return {
    model_id: "spread", value: req.V_f * 1e3, units: "mm/s", uncertainty: unc,
    inputs: { material, x_o2, P_kPa, p_o2_kPa: x_o2 * P_kPa, flow_cm_s, thickness_mm, gravity_g, orientation },
    equation_ids: [...SP.EQ, ...(gravity_g > 0 ? G.EQ : [])],
    assumptions: ["de Ris opposed-flow theory with Burke–Schumann T_f (overpredicts; no radiative loss)",
      "thin fabric: SP1 only; thick plastic: smooth max of thin/thick limits",
      "F(Da) finite-rate correction OFF until fitted to BASS-II (uncalibrated: theory only)",
      gravity_g > 0 ? CAVEAT_G : "microgravity forced flow"],
    validity: { in_envelope: false, nearest_data_distance: null, calibrated: false,
      note: "Uncalibrated — theory only (BASS-II/Saffire digitization pending)", quench_warning: SP.quenchWarning(Veq) },
    sources: ["de-ris-1969", "quintiere-ffp", "fernandez-pello-1981", "bass2-sci-rep-2017", ...(gravity_g > 0 ? ["olson-1991"] : [])],
    extra: { band_mm_s: [r.V_f * 1e3, req.V_f * 1e3], u_b_cm_s: ub * 100, V_eq_cm_s: Veq * 100, T_f_K: r.T_f,
      V_thin_mm_s: req.V_thin * 1e3, V_thick_mm_s: req.V_thick * 1e3, regime_ratio: req.regime_ratio, lnDa: req.lnDa,
      label: gravity_g > 0 ? "bounded estimate" : "" },
  };
}

export function runGravity(x_o2: number, P_kPa: number, flow_cm_s: number, gravity_g: number, material = "sibal",
  orientation: "opposed" | "cross" = "opposed"): ModelResult {
  const x = atmosphere(x_o2);
  const P = P_kPa * 1e3;
  const pr = SP.solidProps(material);
  const Tf = flameTemperature(material, x, T_AMB, pr.T_v);
  const ub = G.buoyantVelocity(gravity_g, x, P, Tf, T_AMB);
  const presets = Object.fromEntries(Object.entries(G.PRESETS).map(([k, g]) => [k, G.buoyantVelocity(g, x, P, Tf, T_AMB) * 100]));
  const Veq = G.equivalentFlow(flow_cm_s / 100, ub, orientation) * 100;
  return {
    model_id: "gravity", value: Veq, units: "cm/s", uncertainty: { p05: flow_cm_s, p50: Veq, p95: Veq },
    inputs: { x_o2, P_kPa, flow_cm_s, gravity_g, material, orientation }, equation_ids: [...G.EQ, "BS2"],
    assumptions: [CAVEAT_G, "band = [forced flow only (µg), forced + buoyant (equivalent)]", "T_f from uncalibrated Burke–Schumann (upper bound on u_b)"],
    validity: { in_envelope: gravity_g === 0 || gravity_g === 1, nearest_data_distance: null, calibrated: false, note: "bounded estimate — no partial-gravity PSI data" },
    sources: ["fernandez-pello-1981", "olson-1991", "ntrs-20250010653", "ntrs-20240015307"],
    extra: { u_b_cm_s: ub * 100, u_b_presets_cm_s: presets, band_cm_s: [flow_cm_s, Veq], label: "bounded estimate", T_f_K: Tf },
  };
}

export function runHabitat(material: string, x_o2: number, P_kPa: number, V_m3: number, Q_kW: number, t_burn_s: number,
  t_end_s = 1800, growth_s = 0, scrubber = false, nMc = 40): ModelResult {
  const inp: H.HabitatInputs = { material, x_o2, P: P_kPa * 1e3, V: V_m3, Q_peak: Q_kW * 1e3, t_burn: t_burn_s, t_end: t_end_s, growth_time: growth_s, scrubber };
  const res = H.simulate(inp);
  const hp = PROPS.habitat, f = fuel(material);
  const unc = monteCarlo((r) => {
    const s = H.simulate({ ...inp, h_w: sampleDist(r, hp.h_w.value, hp.h_w.dist), chi: sampleDist(r, hp.chi_r_lost.value, hp.chi_r_lost.dist),
      y_CO: sampleDist(r, v(f, "y_CO"), f.y_CO.dist) }, 61);
    return Math.max(...s.T) - 298.15;
  }, nMc);
  return {
    model_id: "habitat", value: Math.max(...res.T) - 298.15, units: "K (peak cabin temperature rise)", uncertainty: unc,
    inputs: { material, x_o2, P_kPa, V_m3, Q_kW, t_burn_s, t_end_s, growth_s, scrubber }, equation_ids: H.EQ,
    assumptions: ["single well-mixed zone, fixed volume, no leakage or venting",
      "O₂ consumption 13.1 MJ/kg O₂ (Huggett); CO₂/H₂O from fuel stoichiometry; CO from yield y_CO",
      "wall loss h_w A_w (T − T_w) with h_w UNCALIBRATED (Saffire fit pending)"],
    validity: { in_envelope: Q_kW <= 10 && V_m3 <= 400, nearest_data_distance: null, calibrated: false, note: "Uncalibrated — theory only (Saffire IV–V vehicle data pending)" },
    sources: ["huggett-1980", "gri30", "jsc-20584-revC", "nasa-std-3001-v2", "ntrs-20210011521"],
    extra: { series: res, time_to_1h_limit_s: H.timeToLimits(res), peak_dP_kPa: (Math.max(...res.P) - inp.P) / 1e3,
      min_x_o2: Math.min(...res.x_o2), peak_x_co2: Math.max(...res.x_co2), peak_co_ppm: Math.max(...res.x_co) * 1e6 },
  };
}

export function runSmoke(transport_s: number, N0?: number, d0_nm?: number, P_kPa = 101.3): ModelResult {
  const n0 = N0 ?? prop("smoke", "N0_default");
  const d0 = (d0_nm ?? prop("smoke", "d0_default_nm")) * 1e-9;
  const r = SM.age(transport_s, n0, d0, T_AMB, P_kPa * 1e3);
  return {
    model_id: "smoke", value: r.d30 * 1e9, units: "nm (volume-mean diameter)",
    uncertainty: { p05: r.d10 * 1e9, p50: r.d30 * 1e9, p95: r.d43 * 1e9 },
    inputs: { transport_s, N0_m3: n0, d0_nm: d0 * 1e9, P_kPa }, equation_ids: SM.EQ,
    assumptions: ["monodisperse-equivalent Brownian coagulation with constant K_c(d0)", "self-preserving lognormal width σ_g for d10/d43 (band shows d10–d43, not MC)",
      "N0, d0 UNCALIBRATED (SAME-R fit pending)"],
    validity: { in_envelope: false, nearest_data_distance: null, calibrated: false, note: "Uncalibrated — theory only; SAME-R reports averages mostly 200–400 nm" },
    sources: ["seinfeld-pandis", "same-r"],
    extra: { d10_nm: r.d10 * 1e9, d43_nm: r.d43 * 1e9, N_m3: r.N, K_c: r.K_c, favoured_detector: SM.favouredDetector(r.d43) },
  };
}

export { makeRng, percentiles };
