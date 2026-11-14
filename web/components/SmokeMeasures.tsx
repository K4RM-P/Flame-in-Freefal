"use client";
// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// B5: detection multi-measure view. Number (M0), first moment (M1, ionization-type) and light-scattering mass (DustTrak)
// from SAME/SAME-R (PSI-101 'Reduced data sheet'), plus DAFT nuisance dust (PSI-47). Aggregates computed in ingest_psi.py.
import sm from "@/data/psi/smoke_measures.json";
import { Plot } from "@/components/Plot";
import { SourcePill, fmt } from "@/components/bits";
import { OKABE_ITO } from "@/lib/ui/palette";

interface Mat { material: string; n: number; m0: number; m1: number; dusttrak_b_mg_m3: number; cmd_um: number; dam_um: number; rank_m0: number; rank_m1: number; rank_dusttrak_b_mg_m3: number }
interface Row { material: string; dam_um: number | null; m0: number | null; dusttrak_b_mg_m3: number | null }
const S = sm as unknown as { by_material: Mat[]; rows: Row[]; dust: { sample: string; ptrak_n_cm3: number; dusttrak_mg_m3: number; d_um_mass_number_equiv: number }[];
  labels: Record<string, string>; no_signal_tests: Record<string, number>; aggregation: string; dust_note: string; alarm_note: string };
const spread = (k: "m0" | "dusttrak_b_mg_m3") => Math.max(...S.by_material.map((m) => m[k])) / Math.min(...S.by_material.map((m) => m[k]));
const swapped = S.by_material.filter((m) => m.rank_m0 !== m.rank_dusttrak_b_mg_m3);
const smokeDam = S.rows.filter((r) => (r.m0 ?? 0) > 0 && r.dam_um != null).map((r) => r.dam_um as number);
const dustD = S.dust.map((d) => d.d_um_mass_number_equiv);

export function SmokeMeasures() {
  const mats = S.by_material.map((m) => m.material);
  return (
    <section className="card space-y-3 text-sm" data-testid="smoke-measures">
      <div className="flex flex-wrap items-center gap-2"><span className="label text-ink">Detection · one smoke, three signals</span><SourcePill id="PSI-101" /><SourcePill id="PSI-47" /></div>
      <p className="measure">Across five flight smoke materials the median number concentration differs only {fmt(spread("m0"), 2)}×, while light-scattering mass differs
        {" "}{fmt(spread("dusttrak_b_mg_m3"), 2)}×. {swapped.length ? `${swapped.map((m) => `${m.material} ranks #${m.rank_m0} by number but #${m.rank_dusttrak_b_mg_m3} by mass`).join("; ")}.` : ""}{" "}
        A detector that counts particles and one that weighs them can disagree about which smoke is worse.</p>
      <div className="overflow-x-auto">
        <table className="data"><thead><tr><th>material</th><th>tests</th><th>M0 number (as tabulated)</th><th>M1 first moment, mm/cm³ (ionization-type)</th><th>DustTrak mass, mg/m³ (scattering)</th><th>count-mean d, µm</th><th>rank: number · M1 · mass</th></tr></thead>
          <tbody>{S.by_material.map((m) => (
            <tr key={m.material}><td>{m.material}</td><td className="num">{m.n}</td><td className="num">{fmt(m.m0, 3)}</td><td className="num">{fmt(m.m1, 3)}</td><td className="num">{fmt(m.dusttrak_b_mg_m3, 3)}</td>
              <td className="num">{fmt(m.cmd_um, 2)}</td><td className="num">{m.rank_m0} · {m.rank_m1} · {m.rank_dusttrak_b_mg_m3}</td></tr>))}</tbody></table>
      </div>
      <p className="text-xs text-mute">{S.aggregation}. Tests with no recorded signal (M0 = 0) are left out: {Object.entries(S.no_signal_tests).map(([k, v]) => `${k} ${v}`).join(", ")}.</p>
      <Plot height={220} label="Diameter of average mass: material smoke vs nuisance dust"
        data={[
          ...mats.map((mat, i) => ({ type: "scatter" as const, mode: "markers" as const, name: `${mat} smoke`, x: S.rows.filter((r) => r.material === mat && (r.m0 ?? 0) > 0 && r.dam_um != null).map((r) => r.dam_um as number),
            y: S.rows.filter((r) => r.material === mat && (r.m0 ?? 0) > 0 && r.dam_um != null).map(() => "material smoke (SAME/SAME-R)"), marker: { color: OKABE_ITO[i % OKABE_ITO.length], size: 7, symbol: "circle" } })),
          { type: "scatter" as const, mode: "markers" as const, name: "Arizona Road Dust (DAFT)", x: dustD, y: dustD.map(() => "nuisance dust (DAFT)"), marker: { color: OKABE_ITO[6], size: 10, symbol: "x-thin", line: { width: 2, color: OKABE_ITO[6] } } },
        ]}
        layout={{ margin: { l: 170, r: 8, t: 8, b: 48 }, xaxis: { type: "log", title: { text: "diameter of average mass, µm (from mass ÷ number)" } }, showlegend: false }} />
      <p className="text-xs text-mute">Smoke {fmt(Math.min(...smokeDam), 2)}–{fmt(Math.max(...smokeDam), 2)} µm (per test) vs Arizona Road Dust nuisance dust (DAFT) {fmt(Math.min(...dustD), 3)}–{fmt(Math.max(...dustD), 3)} µm (bag averages).
        {Math.max(...smokeDam) >= Math.min(...dustD) ? " The ranges overlap." : " The ranges do not overlap in these data, so size could help reject this dust."} {S.dust_note}</p>
      <p className="text-xs text-warn">{S.alarm_note}</p>
    </section>
  );
}
