// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// B3: "Earth test vs orbit" — SAFFIRE-II (PSI-99) like-for-like µg vs 1 g burn outcomes. Classification is computed in
// physics/pipeline/ingest_psi.py (Python = source of truth); this component only renders it.
import ev from "@/data/psi/earth_vs_orbit.json";
import { SourcePill, fmt } from "@/components/bits";

interface Row {
  sample: string; material: string; thickness: string; g1_burn_length: string; g1_spread_rate: string; ug_burn_length: string; ug_spread: string;
  ug_class: string; g1_class: string; o2_raw: string; flow_cm_s: number; flow_direction: string; agreement: string; locator: string; source_id: string;
}
const E = ev as unknown as {
  rows: Row[]; excluded: { sample: string; material: string | null; reason: string }[]; n: number; counts: Record<string, number>;
  conditions: { x_o2_min: number; x_o2_max: number; flows_cm_s: number[]; directions: string[] }; classification: string; caveats: string[];
};
const AGREE: Record<string, { label: string; cls: string }> = {
  "orbit better": { label: "Orbit: burned less", cls: "bg-ok/20 text-ok" },
  "same verdict": { label: "Same verdict", cls: "bg-line text-ink" },
  "orbit worse": { label: "Orbit: burned more", cls: "bg-bad/20 text-bad" },
};
const C = E.conditions;
export const EARTH_VS_ORBIT_SUMMARY =
  `Under SAFFIRE-II conditions (${fmt(C.x_o2_min * 100)}–${fmt(C.x_o2_max * 100)}% O₂, ${C.flows_cm_s.join("/")} cm/s ${C.directions.join(" or ").toLowerCase()} flow), ` +
  `${E.counts["orbit better"]} of ${E.n} like-for-like samples burned less in orbit than in the tabulated 1 g test, ${E.counts["same verdict"]} matched and ${E.counts["orbit worse"]} burned more.`;

export function EarthVsOrbit() {
  return (
    <section className="card space-y-3 text-sm" id="earth-vs-orbit" data-testid="earth-vs-orbit">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-[20px] font-semibold">Earth test vs orbit</h2>
        <span className="chip bg-warn/15 text-warn" title="One test per material and thickness">small n · {E.n} samples, 1 test each</span>
        <SourcePill id="PSI-99" />
      </div>
      <p className="measure">SAFFIRE-II&apos;s stated objective is to compare low-g flammability with NASA&apos;s normal-gravity screening test. Each row compares the same
        material and thickness, burned in orbit and in the 1 g test tabulated in PSI-99.</p>
      <p className="measure font-medium" data-testid="evo-summary">{EARTH_VS_ORBIT_SUMMARY} These materials behaved differently in orbit than their ground
        result suggests, under these conditions only. This is not a verdict on the ground test standard.</p>
      <div className="overflow-x-auto">
        <table className="data">
          <thead><tr><th>sample</th><th>material · thickness</th><th>1 g result (burn length · spread rate)</th><th>µg result (burn length · spread)</th>
            <th>µg conditions (O₂ · flow · direction)</th><th>agreement</th><th>source</th></tr></thead>
          <tbody>{E.rows.map((r) => (
            <tr key={`${r.sample}-${r.material}`}>
              <td className="num">{r.sample}</td><td>{r.material} · {r.thickness}</td>
              <td>{r.g1_burn_length} · {r.g1_spread_rate} <span className="text-xs text-mute">({r.g1_class})</span></td>
              <td>{r.ug_burn_length} · {r.ug_spread} <span className="text-xs text-mute">({r.ug_class})</span></td>
              <td className="num">{r.o2_raw}% · {r.flow_cm_s} cm/s · {r.flow_direction}</td>
              <td><span className={`chip ${AGREE[r.agreement].cls}`}>{AGREE[r.agreement].label}</span></td>
              <td className="text-xs text-mute" title={r.locator}>{r.source_id} line {r.locator.split("line ")[1]}</td>
            </tr>))}</tbody>
        </table>
      </div>
      <p className="text-xs text-mute">Classification: {E.classification}</p>
      <ul className="ml-5 list-disc text-xs text-mute">
        {E.caveats.map((c) => <li key={c}>{c}</li>)}
        <li>Excluded: {E.excluded.map((x) => `${x.sample}${x.material ? ` (${x.material})` : ""} — ${x.reason}`).join("; ")}.</li>
        <li>BASS and BASS-II (PSI-26/25) aim to bridge NASA-STD-6001 Test 1 and flight, but their PSI tables hold no 1 g results, so they add no like-for-like rows.</li>
      </ul>
    </section>
  );
}
