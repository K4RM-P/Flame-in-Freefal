// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Evidence behind a run: PSI investigations ranked by how close their test conditions sit to the scenario.
import catalogJson from "@/data/psi_catalog.json";
import investigationsJ from "@/data/investigations.json";
import tablesIndex from "@/data/psi/tables_index.json";
import evoJ from "@/data/psi/earth_vs_orbit.json";
import { MATERIALS } from "./params";
import type { Scenario } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */
export type Role = "spread" | "cabin" | "smoke" | "suppression";
export interface EvidenceRow {
  accession: string; title: string; short_name: string; summary: string; role: Role[]; doi: string | null; url: string;
  n_rows: number; distance: number; why: string;
  dimensions?: { oxygen: number; pressure: number; flow: number; gravity: number; material: number };
}
const ROLE_BY_FAMILY: Record<string, Role[]> = {
  solid_spread: ["spread"], large_scale: ["spread", "cabin"], smoke: ["smoke"], droplet: ["suppression"],
};
const CAT: Record<string, any> = (catalogJson as any).investigations ?? {};
const N_ROWS: Record<string, number> = {};
for (const t of tablesIndex as any[]) for (const a of t.accessions ?? []) N_ROWS[a] = (N_ROWS[a] ?? 0) + Number(t.rows ?? 0);

// Distance scales: one "unit" of mismatch per scale (normalisation only, not a physical property).
const SCALE = { x_o2: 0.05, P_kPa: 20, flow_cm_s: 10, gravity_g: 0.5 };
const gap = (x: number, r: [number, number] | null | undefined, sc: number) => (!r ? 1 : x < r[0] ? (r[0] - x) / sc : x > r[1] ? (x - r[1]) / sc : 0);

function materialNames(s: Scenario): string[] {
  return s.items.flatMap((i) => {
    const m = MATERIALS.find((x) => x.material_key === i.material_key);
    return [i.material_key, m?.display_name ?? "", m?.properties_key ?? ""].filter(Boolean).map((n) => n.toLowerCase());
  });
}
const firstSentence = (t: string) => (t.split(/(?<=\.)\s/)[0] ?? t).trim();

export function rankEvidence(s: Scenario): EvidenceRow[] {
  const names = materialNames(s);
  const rows: EvidenceRow[] = [];
  for (const inv of Object.values(investigationsJ as Record<string, any>)) {
    const roles = ROLE_BY_FAMILY[inv.family];
    if (!roles) continue;
    const gO2 = gap(s.cabin.x_o2, inv.o2_range, SCALE.x_o2);
    const gP = gap(s.cabin.P_Pa / 1e3, inv.p_range_kpa, SCALE.P_kPa);
    const gF = inv.family === "droplet" ? 0 : gap(s.cabin.flow_m_s * 100, inv.flow_range_cm_s, SCALE.flow_cm_s);
    const gG = s.cabin.gravity_g / SCALE.gravity_g; // all PSI fire tests are µg (ISS/Cygnus)
    const fuels: string[] = (inv.fuels ?? []).map((f: string) => f.toLowerCase());
    const matHit = names.some((n) => fuels.some((f) => f.includes(n) || n.includes(f)));
    const gM = inv.family === "smoke" || inv.family === "droplet" ? 0.5 : matHit ? 0 : 1;
    const distance = Math.hypot(gO2, gP, gF, gG, gM);
    const why = [
      gO2 === 0 ? "O₂ inside tested range" : `O₂ ${gO2.toFixed(1)}× scale outside`,
      gP === 0 ? "pressure inside" : `pressure ${gP.toFixed(1)}× scale outside`,
      inv.family === "droplet" ? "suppression chemistry (droplets)" : gF === 0 ? "flow inside" : `flow ${gF.toFixed(1)}× scale outside`,
      matHit ? "same material tested" : inv.family === "smoke" ? "smoke source evidence" : "different material",
    ].join(" · ");
    for (const acc of inv.psi_accessions ?? []) {
      const c = CAT[acc];
      if (!c) continue;
      rows.push({
        accession: acc, title: c.title, short_name: c.short_name, summary: firstSentence(inv.objective ?? c.objective ?? ""),
        role: roles, doi: c.doi ?? null, url: c.psi_url ?? (c.doi ? `https://doi.org/${c.doi}` : "https://psi.nasa.gov"),
        n_rows: N_ROWS[acc] ?? 0, distance, why, dimensions: { oxygen: gO2, pressure: gP, flow: gF, gravity: gG, material: gM },
      });
    }
  }
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
