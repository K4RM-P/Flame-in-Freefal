// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Evidence behind a run: PSI investigations gated by material class FIRST, then ranked by condition distance.
//  spread / cabin: investigations that burned THIS material, then the same class (solid fabric/plastic), then ACME BRE
//  (PSI-20) when the mission x_O₂ ≥ 0.26 (the only flight data at exploration atmospheres; a gas burner emulating solids).
//  Liquid-droplet investigations appear only under the suppression role. Smoke role: SAME, SAME-R, DAFT.
import catalogJson from "@/data/psi_catalog.json";
import investigationsJ from "@/data/investigations.json";
import tablesIndex from "@/data/psi/tables_index.json";
import evoJ from "@/data/psi/earth_vs_orbit.json";
import { ENVELOPE_SCALE, MATERIALS, atmosphereById, insideRange, tolerantRange } from "./params";
import type { Scenario } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */
export type Role = "spread" | "cabin" | "smoke" | "suppression";
export interface EvidenceRow {
  accession: string; title: string; short_name: string; summary: string; role: Role[]; doi: string | null; url: string;
  n_rows: number; distance: number; why: string; tier: number; tier_label: string;
  dimensions?: { oxygen: number; pressure: number; flow: number; gravity: number; material: number };
}
const CAT: Record<string, any> = (catalogJson as any).investigations ?? {};
const INV = investigationsJ as Record<string, any>;
const N_ROWS: Record<string, number> = {};
for (const t of tablesIndex as any[]) for (const a of t.accessions ?? []) N_ROWS[a] = (N_ROWS[a] ?? 0) + Number(t.rows ?? 0);
export const BRE_MIN_X_O2 = 0.26;
const BRE_ACC = "PSI-20";
const SMOKE_EXTRA = ["PSI-47"]; // DAFT: in the PSI catalogue but not in investigations.json
const gap = (x: number, r: [number, number] | null | undefined, sc: number) => (!r ? 1 : x < r[0] ? (r[0] - x) / sc : x > r[1] ? (x - r[1]) / sc : 0);

function materialNames(s: Scenario): string[] {
  return s.items.flatMap((i) => {
    const m = MATERIALS.find((x) => x.material_key === i.material_key);
    return [i.material_key, m?.display_name ?? "", m?.properties_key ?? ""].filter(Boolean).map((n) => n.toLowerCase());
  });
}
const firstSentence = (t: string) => (t.split(/(?<=\.)\s/)[0] ?? t).trim();
const TIER_LABEL: Record<number, string> = { 0: "burned this material", 1: "same class: solid fabric/plastic", 2: "only flight data at exploration atmospheres; gas burner emulating solids", 3: "smoke source evidence", 4: "suppression chemistry (liquid droplets)" };

export function rankEvidence(s: Scenario): EvidenceRow[] {
  const names = materialNames(s);
  const rows: EvidenceRow[] = [];
  const push = (acc: string, inv: any, roles: Role[], tier: number, dims: EvidenceRow["dimensions"], why: string) => {
    const c = CAT[acc];
    if (!c) return;
    const distance = tier * 10 + Math.hypot(dims!.oxygen, dims!.pressure, dims!.flow, dims!.gravity, dims!.material);
    rows.push({
      accession: acc, title: c.title, short_name: c.short_name, summary: firstSentence(inv?.objective ?? c.objective ?? ""),
      role: roles, doi: c.doi ?? null, url: c.psi_url ?? (c.doi ? `https://doi.org/${c.doi}` : "https://psi.nasa.gov"),
      n_rows: N_ROWS[acc] ?? 0, distance, why: `${TIER_LABEL[tier]} · ${why}`, tier, tier_label: TIER_LABEL[tier], dimensions: dims,
    });
  };
  for (const inv of Object.values(INV)) {
    const fam = inv.family as string;
    const accs: string[] = inv.psi_accessions ?? [];
    const isBre = accs.includes(BRE_ACC);
    let roles: Role[], tier: number;
    const fuels: string[] = (inv.fuels ?? []).map((f: string) => f.toLowerCase());
    const matHit = names.some((n) => fuels.some((f) => f.includes(n) || n.includes(f)));
    if (fam === "solid_spread") { roles = ["spread"]; tier = matHit ? 0 : 1; }
    else if (fam === "large_scale") { roles = ["spread", "cabin"]; tier = matHit ? 0 : 1; }
    else if (isBre) { if (s.cabin.x_o2 < BRE_MIN_X_O2) continue; roles = ["spread", "cabin"]; tier = 2; }
    else if (fam === "smoke") { roles = ["smoke"]; tier = 3; }
    else if (fam === "droplet") { roles = ["suppression"]; tier = 4; }
    else continue;
    const gO2 = gap(s.cabin.x_o2, inv.o2_range, ENVELOPE_SCALE.x_o2);
    const gP = gap(s.cabin.P_Pa, inv.p_range_kpa ? [inv.p_range_kpa[0] * 1e3, inv.p_range_kpa[1] * 1e3] : null, ENVELOPE_SCALE.P_Pa);
    const gF = fam === "droplet" || isBre ? 0 : gap(s.cabin.flow_m_s, inv.flow_range_cm_s ? [inv.flow_range_cm_s[0] / 100, inv.flow_range_cm_s[1] / 100] : null, ENVELOPE_SCALE.flow_m_s);
    const gG = s.cabin.gravity_g / ENVELOPE_SCALE.gravity_g; // all PSI fire tests are µg (ISS/Cygnus)
    const gM = tier === 0 ? 0 : tier === 1 ? 1 : 0.5;
    const why = [
      gO2 === 0 ? "O₂ inside tested range" : `O₂ ${gO2.toFixed(1)}× scale outside`,
      gP === 0 ? "pressure inside" : `pressure ${gP.toFixed(1)}× scale outside`,
      fam === "droplet" || isBre ? "no forced flow" : gF === 0 ? "flow inside" : `flow ${gF.toFixed(1)}× scale outside`,
    ].join(" · ");
    for (const acc of accs) push(acc, inv, roles, tier, { oxygen: gO2, pressure: gP, flow: gF, gravity: gG, material: gM }, why);
  }
  for (const acc of SMOKE_EXTRA) if (!rows.some((r) => r.accession === acc)) push(acc, null, ["smoke"], 3, { oxygen: 1, pressure: 1, flow: 1, gravity: s.cabin.gravity_g / ENVELOPE_SCALE.gravity_g, material: 0.5 }, "test conditions not tabulated in investigations.json");
  return rows.sort((a, b) => a.distance - b.distance || b.n_rows - a.n_rows);
}

/** SAFFIRE-II µg vs 1 g rows for the chosen materials (like-for-like, single tests). */
export function earthVsOrbit(materialKeys: string[]) {
  const j = evoJ as any;
  const names = materialKeys.flatMap((k) => {
    const m = MATERIALS.find((x) => x.material_key === k);
    return [k, m?.display_name ?? "", m?.properties_key ?? ""].filter(Boolean).map((n) => n.toLowerCase());
  });
  const rows = (j.rows ?? []).filter((r: any) => r.material && names.some((n) => r.material.toLowerCase().includes(n) || n.includes(r.material.toLowerCase())));
  return { rows, caveats: j.caveats ?? [], conditions: j.conditions, source_ids: j.source_ids ?? [] };
}

/** All SAFFIRE-II like-for-like rows with counts computed from the data (never hard-coded). */
export function earthVsOrbitSummary() {
  const j = evoJ as any;
  const rows: any[] = j.rows ?? [];
  const cls = (a: string) => { const t = String(a ?? "").toLowerCase(); return /worse/.test(t) ? "worse" : /better|less/.test(t) ? "better" : "same"; };
  const counts = { better: 0, same: 0, worse: 0, n: rows.length };
  for (const r of rows) counts[cls(r.agreement)]++;
  const source_ids: string[] = j.source_ids?.length ? j.source_ids : [...new Set(rows.map((r) => r.source_id).filter(Boolean))];
  return { rows, counts, caveats: (j.caveats ?? []) as string[], source_ids, conditions: j.conditions };
}

/** "Where the evidence stops": per material, the PSI-tested O₂, pressure and flow ranges against a mission atmosphere. */
export function evidenceStops(missionId = "LunarHabitat") {
  const a = atmosphereById(missionId);
  const mission = { id: missionId, name: a?.name ?? missionId, x_o2: a?.x_o2 ?? NaN, P_Pa: a?.P_Pa ?? NaN, flow_m_s: a?.flow_m_s ?? NaN, gravity_g: a?.gravity_g ?? NaN };
  const span = (accs: string[], k: string, f = 1): [number, number] | null => {
    const r = Object.values(INV).filter((v) => (v.psi_accessions ?? []).some((x: string) => accs.includes(x)) && Array.isArray(v[k]) && v[k].length === 2).map((v) => v[k] as [number, number]);
    return r.length ? [Math.min(...r.map((x) => x[0])) * f, Math.max(...r.map((x) => x[1])) * f] : null;
  };
  const rows = MATERIALS.filter((m) => m.has_burn_data).map((m) => {
    const P_range_Pa = span(m.investigations, "p_range_kpa", 1e3);
    return {
      material_key: m.material_key, display_name: m.display_name, o2_range: m.o2_range, P_range_Pa, flow_range_m_s: m.flow_range_m_s,
      investigations: m.investigations, n_tests: m.n_tests,
      beyond: {
        o2: !!m.o2_range && !insideRange(mission.x_o2, tolerantRange(m.o2_range, "x_o2")),
        P: !!P_range_Pa && !insideRange(mission.P_Pa, tolerantRange(P_range_Pa, "P_Pa")),
        flow: !!m.flow_range_m_s && !insideRange(mission.flow_m_s, tolerantRange(m.flow_range_m_s, "flow_m_s")),
      },
    };
  });
  const o2s = rows.map((r) => r.o2_range?.[1]).filter((x): x is number => typeof x === "number");
  const max_solid_x_o2 = o2s.length ? Math.max(...o2s) : null;
  const bre = Object.values(INV).find((v) => (v.psi_accessions ?? []).includes(BRE_ACC));
  const breHi = bre?.o2_range?.[1];
  const bre_note = `ACME BRE (${BRE_ACC}) is the only PSI flight data at exploration atmospheres${typeof breHi === "number" ? ` (O₂ up to ${(breHi * 100).toFixed(0)} %)` : ""}: a gas burner that emulates solids, not a solid material.`;
  return { mission, rows, max_solid_x_o2, bre_note };
}
