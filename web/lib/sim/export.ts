// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Exports: PSI test rows behind a run (with provenance), the simulated time series, and the scenario JSON.
import saffire from "@/public/psi/saffire.json";
import bass2 from "@/public/psi/bass2.json";
import sameR from "@/public/psi/same_r.json";
import { MATERIALS } from "./params";
import type { Scenario, SimResult } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */
const csvCell = (v: unknown) => {
  if (v === null || v === undefined) return "";
  const s = typeof v === "number" ? (Number.isFinite(v) ? String(v) : "") : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const toCsv = (head: string[], rows: unknown[][]) => [head.join(","), ...rows.map((r) => r.map(csvCell).join(","))].join("\n") + "\n";

/** PSI rows (SAFFIRE I–III, BASS-II, SAME-R) whose material matches an item in the scenario. */
export function psiRowsFor(s: Scenario): any[] {
  const names = s.items.flatMap((i) => {
    const m = MATERIALS.find((x) => x.material_key === i.material_key);
    return [i.material_key, m?.display_name ?? "", m?.properties_key ?? ""].filter((n) => n.length > 2).map((n) => n.toLowerCase());
  });
  const all = [...(saffire as any[]), ...(bass2 as any[]), ...(sameR as any[])];
  return all.filter((r) => { const mm = String(r.material ?? r.sample_text ?? "").toLowerCase(); return mm && names.some((n) => mm.includes(n)); });
}
export function exportPsiRowsCsv(s: Scenario, _r?: SimResult | null): string {
  const head = ["source_id", "locator", "accession", "table", "material", "x_o2", "x_o2_initial", "flow_cm_s", "thickness_mm", "qc_flag", "verified", "raw"];
  return toCsv(head, psiRowsFor(s).map((r) => head.map((h) => r[h])));
}
export function exportSeriesCsv(r: SimResult): string {
  const fields = Object.keys(r.state[0] ?? {}) as (keyof SimResult["state"][number])[];
  const bandCols = r.bands ? Object.keys(r.bands).flatMap((k) => [`${k}_p05`, `${k}_p50`, `${k}_p95`]) : [];
  const head = ["t_s", ...fields, ...bandCols];
  const rows = r.t.map((t, i) => [t, ...fields.map((f) => r.state[i][f]),
    ...(r.bands ? Object.values(r.bands).flatMap((b) => [b.p05[i], b.p50[i], b.p95[i]]) : [])]);
  const meta = `# EmberAtlas engine ${r.provenance.engine_version}, seed ${r.provenance.seed}; SI units (K, Pa, mol/mol, kg/m3, W, m2)\n`;
  return meta + toCsv(head, rows);
}
export function exportScenarioJson(s: Scenario): string {
  return JSON.stringify(s, null, 2) + "\n";
}
