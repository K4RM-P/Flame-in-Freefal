// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Single loading point for every data file the simulator reads. Missing or empty files degrade to
// "not calibrated" / "no data" — no value is ever invented here.
import spreadJ from "@/data/params/spread.json";
import habitatJ from "@/data/params/habitat.json";
import smokeJ from "@/data/params/smoke.json";
import cabinsJ from "@/data/cabins.json";
import materialsJ from "@/data/materials.json";
import telemetryJ from "@/data/psi/saffire_telemetry.json";
import missionsJ from "@/data/missions.json";
import investigationsJ from "@/data/investigations.json";
import { LIMITS, PROPS } from "@/lib/physics/data";
import type { Provenance } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface ParamFile {
  calibrated: boolean; params: Record<string, any>; param_sd: Record<string, number>; sources: string[]; note?: string; raw: any;
}
function pf(x: any): ParamFile {
  return { calibrated: x?.calibrated === true, params: x?.params ?? {}, param_sd: x?.param_sd ?? {}, sources: x?.sources ?? [], note: x?.note, raw: x };
}
export const SPREAD = pf(spreadJ);
export const HABITAT = pf(habitatJ);
export const SMOKE = pf(smokeJ);

const num = (x: any): number | null => (typeof x === "number" && Number.isFinite(x) ? x : x && typeof x === "object" && Number.isFinite(Number(x.value)) ? Number(x.value) : null);

// ---------- materials ----------
export interface Material {
  material_key: string; display_name: string; n_tests: number | null; investigations: string[];
  o2_range: [number, number] | null; flow_range_m_s: [number, number] | null; thicknesses_m: number[];
  has_burn_data: boolean; has_smoke_data: boolean; properties_key: string | null; sources: Provenance[];
  /** true when properties.json carries the solid properties the spread model needs */
  ignitable: boolean;
}
function propsOk(key: string | null): boolean {
  const f = key ? PROPS.fuels?.[key] : null;
  return !!f && f.phase === "solid" && !!f.T_v && !!f.c_s && !!f.dHc && !!f.formula && !!(f.areal_density || f.rho_s);
}
function normRange(r: any): [number, number] | null {
  if (!Array.isArray(r) || r.length < 2) return null;
  const a = Number(r[0]), b = Number(r[1]);
  return Number.isFinite(a) && Number.isFinite(b) ? [a, b] : null;
}
function normMaterial(m: any): Material {
  const key = m.properties_key ?? (PROPS.fuels?.[m.material_key] ? m.material_key : null);
  const o2 = normRange(m.o2_range);
  return {
    material_key: String(m.material_key), display_name: String(m.display_name ?? m.material_key),
    n_tests: num(m.n_tests), investigations: m.investigations ?? [],
    o2_range: o2 && o2[1] > 1 ? [o2[0] / 100, o2[1] / 100] : o2, // tolerate percent
    flow_range_m_s: normRange(m.flow_range_m_s) ?? (normRange(m.flow_range_cm_s)?.map((x) => x / 100) as [number, number] | undefined) ?? null,
    thicknesses_m: (m.thicknesses_m ?? (m.thicknesses_mm ?? m.thicknesses ?? []).map((x: number) => x / 1000)).map(Number).filter(Number.isFinite),
    has_burn_data: m.has_burn_data === true, has_smoke_data: m.has_smoke_data === true, properties_key: key,
    sources: (m.sources ?? []).map((s: any) => (typeof s === "string" ? { source_id: s } : s)),
    ignitable: m.has_burn_data === true && propsOk(key),
  };
}
const rawMaterials: any[] = Array.isArray(materialsJ) ? (materialsJ as any[]) : ((materialsJ as any)?.materials ?? []);
/** Library of materials with PSI data. If materials.json is not yet built, fall back to the solids in properties.json
 *  (flagged: no PSI test counts). */
export const MATERIALS: Material[] = rawMaterials.length
  ? rawMaterials.map(normMaterial)
  : Object.entries(PROPS.fuels ?? {}).filter(([, f]: [string, any]) => f.phase === "solid").map(([k]) => ({
    ...normMaterial({ material_key: k, display_name: k, has_burn_data: true, properties_key: k, sources: [{ source_id: "properties.json", note: "materials.json not built; no PSI test counts" }] }),
    n_tests: null,
  }));
export const MATERIALS_FROM_PSI = rawMaterials.length > 0;
export function material(key: string): Material {
  const m = MATERIALS.find((x) => x.material_key === key);
  if (!m) throw new Error(`material '${key}' is not in the PSI material library`);
  return m;
}

// ---------- limits (SI: mole fraction for CO/CO2, Pa for p_O2) ----------
export interface Limit { key: "co" | "co2" | "o2_min"; label: string; value: number; units: string; source: string; locator?: string; status?: string; note?: string }
function fromCabins(key: string, c: any): Limit | null {
  const v = num(c);
  if (v === null) return null;
  const u = String(c.units ?? "").toLowerCase();
  const si = u === "ppm" ? v * 1e-6 : u === "%" || u === "percent" ? v / 100 : u === "kpa" ? v * 1e3 : v;
  const siU = key === "o2_min" ? "Pa" : "mol/mol";
  return { key: key as Limit["key"], label: c.label ?? key, value: si, units: siU, source: String(c.source ?? ""), locator: c.locator, status: c.status, note: c.duration ?? c.note };
}
function loadLimits(): Limit[] {
  const cl = (cabinsJ as any)?.limits ?? {};
  const out: Limit[] = [];
  for (const k of ["co", "co2", "o2_min"]) {
    const l = cl[k] ?? cl[k.toUpperCase()];
    const lim = l ? fromCabins(k, l) : null;
    if (lim && lim.source) out.push(lim);
  }
  const have = new Set(out.map((l) => l.key));
  // Fallback: physics limits.json (1 h values — the event window is ≤ 600 s).
  if (!have.has("co") && LIMITS?.CO?.ppm?.["1h"]) out.push({ key: "co", label: "CO 1 h SMAC", value: LIMITS.CO.ppm["1h"] * 1e-6, units: "mol/mol", source: LIMITS.CO.source, locator: LIMITS.CO.locator, status: LIMITS.CO.status, note: "1 h limit" });
  if (!have.has("co2") && LIMITS?.CO2?.ppm?.["1h"]) out.push({ key: "co2", label: "CO₂ 1 h limit", value: LIMITS.CO2.ppm["1h"] * 1e-6, units: "mol/mol", source: LIMITS.CO2.source, locator: LIMITS.CO2.locator, status: LIMITS.CO2.status, note: LIMITS.CO2.note });
  if (!have.has("o2_min") && LIMITS?.O2_min?.p_o2_kPa) out.push({ key: "o2_min", label: "Minimum ppO₂", value: LIMITS.O2_min.p_o2_kPa * 1e3, units: "Pa", source: LIMITS.O2_min.source, status: LIMITS.O2_min.status, note: LIMITS.O2_min.note });
  return out;
}
export const LIMITS_SI: Limit[] = loadLimits();
export const limit = (k: Limit["key"]) => LIMITS_SI.find((l) => l.key === k) ?? null;

// ---------- detectors ----------
export interface DetectorSpec { threshold: number; units: "kg/m3"; source: string; locator?: string }
export function detectorSpec(type: "photoelectric" | "ionization"): DetectorSpec | null {
  const d = (cabinsJ as any)?.detectors?.[type];
  const v = num(d?.threshold ?? d);
  if (!d || v === null || !d.source) return null;
  const u = String(d.units ?? "kg/m3").toLowerCase().replace("³", "3");
  const si = u === "mg/m3" ? v * 1e-6 : u === "g/m3" ? v * 1e-3 : u === "kg/m3" ? v : null;
  return si === null ? null : { threshold: si, units: "kg/m3", source: d.source, locator: d.locator };
}

// ---------- atmospheres / cabins ----------
export interface Atmosphere { id: string; name: string; x_o2: number; P_Pa: number; gravity_g: number; flow_m_s: number | null; V_m3: number | null; sources: Record<string, Provenance> }
function atmFromCabins(id: string, a: any): Atmosphere {
  const src = (f: string, d: any) => ({ source_id: String(d?.source ?? a.source ?? ""), locator: d?.locator ?? a.locator, note: d?.note });
  const P = num(a.P_Pa) ?? (num(a.P_kPa) !== null ? num(a.P_kPa)! * 1e3 : null);
  return {
    id, name: a.name ?? id, x_o2: num(a.x_o2) ?? NaN, P_Pa: P ?? NaN, gravity_g: num(a.gravity_g) ?? 0,
    flow_m_s: num(a.flow_m_s) ?? (num(a.flow_cm_s) !== null ? num(a.flow_cm_s)! / 100 : null),
    V_m3: num(a.V_m3) !== null && a.V_m3?.status !== "placeholder" ? num(a.V_m3) : null,
    sources: { x_o2: src("x_o2", a.x_o2), P_Pa: src("P", a.P_Pa ?? a.P_kPa), V_m3: src("V", a.V_m3), flow_m_s: src("flow", a.flow_m_s ?? a.flow_cm_s) },
  };
}
function atmFromMission(id: string, m: any): Atmosphere {
  const vol = m.V_free_m3;
  const placeholder = /placeholder/i.test(String(vol?.note ?? "")) || /golden question/i.test(String(vol?.note ?? ""));
  return {
    id, name: m.name, x_o2: m.x_o2, P_Pa: m.P_kPa * 1e3, gravity_g: m.gravity_g, flow_m_s: m.flow_cm_s / 100,
    V_m3: placeholder ? null : num(vol),
    sources: {
      x_o2: { source_id: m.source, locator: "missions.json" }, P_Pa: { source_id: m.source, locator: "missions.json" },
      flow_m_s: { source_id: m.source, locator: "missions.json", note: "cabin ventilation speed as listed for the mission" },
      V_m3: placeholder ? { source_id: "", note: "no sourced volume — required user field" } : { source_id: vol?.source ?? m.source, note: vol?.note, locator: vol?.status },
    },
  };
}
export function atmosphereById(id: string): Atmosphere | null {
  const c = (cabinsJ as any)?.atmospheres?.[id] ?? (cabinsJ as any)?.cabins?.[id];
  if (c) return atmFromCabins(id, c);
  const m = (missionsJ as any)?.[id];
  return m ? atmFromMission(id, m) : null;
}
export const CABINS_RAW: any = cabinsJ;

// ---------- Saffire telemetry (PSI-100) ----------
export interface Telemetry { source_id: string; locator: string; t: number[]; T_K?: number[]; x_o2?: number[]; x_co2?: number[]; P_Pa?: number[]; meta: any }
/** Accepts {rows:[{t_s,T_K,x_o2,...}]} or column arrays {t_s:[],...}. Empty → null. */
export function loadTelemetry(j: any = telemetryJ): Telemetry | null {
  if (!j) return null;
  const rows: any[] = Array.isArray(j.rows) ? j.rows : [];
  const col = (k: string, alt: string[] = []): number[] | undefined => {
    for (const key of [k, ...alt]) {
      if (Array.isArray(j[key]) && j[key].length) return j[key].map(Number);
      if (rows.length && rows[0][key] !== undefined) return rows.map((r) => Number(r[key]));
    }
    return undefined;
  };
  const t = col("t_s", ["t"]);
  if (!t || !t.length) return null;
  let T = col("T_K");
  if (!T) { const c = col("T_C"); if (c) T = c.map((x) => x + 273.15); }
  let x_o2 = col("x_o2");
  if (!x_o2) { const p = col("o2_pct", ["O2_pct"]); if (p) x_o2 = p.map((x) => x / 100); }
  let x_co2 = col("x_co2");
  if (!x_co2) { const p = col("co2_pct", ["CO2_pct"]); if (p) x_co2 = p.map((x) => x / 100); }
  const P = col("P_Pa");
  return { source_id: String(j.source_id ?? "PSI-100"), locator: String(j.locator ?? j.file ?? ""), t, T_K: T, x_o2, x_co2, P_Pa: P, meta: j };
}
export const TELEMETRY = loadTelemetry();

// ---------- PSI solid-fuel envelope (from investigations.json ranges of solid-spread and large-scale families) ----------
const SOLID_INV = Object.entries(investigationsJ as Record<string, any>).filter(([, v]) => ["solid_spread", "large_scale"].includes(v.family));
function span(k: string): [number, number] | null {
  const r = SOLID_INV.map(([, v]) => v[k]).filter((x) => Array.isArray(x) && x.length === 2);
  return r.length ? [Math.min(...r.map((x) => x[0])), Math.max(...r.map((x) => x[1]))] : null;
}
export const SOLID_ENVELOPE = {
  P_Pa: span("p_range_kpa")?.map((x) => x * 1e3) as [number, number] | undefined,
  x_o2: span("o2_range") ?? undefined,
  flow_m_s: span("flow_range_cm_s")?.map((x) => x / 100) as [number, number] | undefined,
  gravity_g: [0, 0] as [number, number], // ISS/Cygnus tests only; 1 g ground comparisons are separate
  sources: SOLID_INV.flatMap(([, v]) => v.psi_accessions ?? []),
};
