// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Data adapters for the simulator screen. Materials and telemetry come normalized from the engine's single loader
// (lib/sim/params.ts); the PSI catalog comes from web/data/psi_catalog.json.
import catalogJson from "@/data/psi_catalog.json";
import { MATERIALS, TELEMETRY, type Material } from "@/lib/sim/params";

export { MATERIALS, TELEMETRY, type Material };
export const materialByKey = (k: string) => MATERIALS.find((m) => m.material_key === k);

const pct = (x: number) => Math.round(x * 1000) / 10;
/** "SIBAL · 14 ISS tests · 21–22% O₂" — built only from materials.json. */
export function depthLine(m: Material): string {
  const parts = [m.display_name, m.n_tests == null ? "no PSI test count" : `${m.n_tests} ISS test${m.n_tests === 1 ? "" : "s"}`];
  if (m.o2_range) parts.push(m.o2_range[0] === m.o2_range[1] ? `${pct(m.o2_range[0])}% O₂` : `${pct(m.o2_range[0])}–${pct(m.o2_range[1])}% O₂`);
  return parts.join(" · ");
}
export const canIgnite = (m: Material | undefined) => !!m?.ignitable;

interface CatalogInv { accession: string; short_name?: string; title?: string; doi?: string | null; objective?: string }
const CAT = (catalogJson as unknown as { investigations: Record<string, CatalogInv> | CatalogInv[] }).investigations;
export const CATALOG: CatalogInv[] = Array.isArray(CAT) ? CAT : Object.values(CAT);
export const catalogEntry = (acc: string) => CATALOG.find((c) => c.accession === acc);
export const psiUrl = (acc: string) => `https://psi.nasa.gov/physci/repo/investigations/${acc}`;
export const doiUrl = (doi?: string | null) => (doi ? (doi.startsWith("http") ? doi : `https://doi.org/${doi}`) : null);
