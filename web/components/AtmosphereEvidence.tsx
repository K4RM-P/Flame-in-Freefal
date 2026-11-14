"use client";
// B4: exploration-atmosphere evidence. ACME BRE (PSI-20) is the flight dataset whose objective lists NASA's exploration
// atmospheres. Values come only from the PSI-20 table / metadata (ingest_psi.py) and the cited key finding.
import bre from "@/data/psi/bre_atmospheres.json";
import inv from "@/data/investigations.json";
import { useMission } from "@/lib/store";
import { SourcePill, fmt } from "@/components/bits";
import { psia } from "@/lib/ui/format";

const B = bre as unknown as {
  n_days: number; by_o2: Record<string, { o2_pct: number; test_days: number; fuels: string[]; burners_mm: number[] }>;
  objective_atmospheres: { psia: number; o2_pct: number }[]; objective_quote: string; pressure_note: string;
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const finding = ((inv as any)["ACME-BRE"].key_findings as { text: string; source_id: string; locator: string }[])[0];
const O2_TOL_PCT = 0.25; // match tolerance on O2 percent (the PSI table lists levels to 0.5 %)
const P_TOL_PSIA = 0.1; // match tolerance on pressure (objective atmospheres are quoted to 0.1 psia)

export function AtmosphereEvidence() {
  const m = useMission();
  const o2 = m.x_o2 * 100, p = psia(m.P_kPa);
  const level = Object.values(B.by_o2).find((l) => Math.abs(l.o2_pct - o2) <= O2_TOL_PCT);
  const target = B.objective_atmospheres.find((a) => Math.abs(a.o2_pct - o2) <= O2_TOL_PCT && Math.abs(a.psia - p) <= P_TOL_PSIA);
  if (!level && !target) return null;
  return (
    <section className="card space-y-1 text-sm" data-testid="atmosphere-evidence">
      <div className="flex flex-wrap items-center gap-2">
        <span className="label text-ink">Flown in orbit at this O₂ level: ACME BRE (PSI-20)</span><SourcePill id="PSI-20" />
      </div>
      {level && <p>Flames ignited at {fmt(level.o2_pct)}% O₂ on {level.test_days} of {B.n_days} BRE test days ({level.fuels.join(", ")}; {level.burners_mm.join(" and ")} mm burners). Gas-fuelled porous-burner flames, not cabin fabrics.</p>}
      {target && <p>{fmt(target.psia)} psia / {fmt(target.o2_pct)}% O₂ is one of the NASA exploration atmospheres listed in BRE&apos;s flight objective.</p>}
      <p className="text-xs text-warn">{B.pressure_note} So a match at {fmt(p, 3)} psia is not confirmed by the table.</p>
      <p className="text-xs">Reported result: {finding.text} <SourcePill id={finding.source_id} /> <span className="chip bg-warn/15 text-warn">to verify</span></p>
    </section>
  );
}
