// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
import type { measuredComparisons } from "@/lib/ai/evidenceBrief";
import type { Scenario } from "@/lib/sim/types";

export type BriefAnalysisData = { takeaway: string; gap: string; proposedTest: string };
export type BriefComparison = ReturnType<typeof measuredComparisons>;

export function BriefAnalysis({ scenario, ai, comparison, notice, onOpenDraft }: {
  scenario: Scenario | null;
  ai: BriefAnalysisData | null;
  comparison: BriefComparison | null;
  notice: string | null;
  onOpenDraft: () => void;
}) {
  return (
    <section className="panel space-y-4 p-4" aria-labelledby="brief-title" aria-live="polite">
      <h2 id="brief-title" className="text-xl font-semibold">AI/SI-powered evidence brief</h2>
      {!scenario && <p className="text-sm text-mute">Enter your design and build a brief to compare it with NASA experiments.</p>}
      {scenario && <p className="text-sm text-mute">
        {scenario.name} · {Number((scenario.cabin.x_o2 * 100).toPrecision(4))}% O₂ · {scenario.cabin.P_Pa / 1000} kPa · {scenario.cabin.gravity_g} g · {Number((scenario.cabin.flow_m_s * 100).toPrecision(4))} cm/s airflow
      </p>}
      {ai && (
        <dl className="grid gap-3">
          <div><dt className="font-semibold">What the evidence supports</dt><dd className="text-mute">{ai.takeaway}</dd></div>
          <div><dt className="font-semibold">Where the evidence stops</dt><dd className="text-mute">{ai.gap}</dd></div>
          <div className="rounded-md border border-line bg-surface2 p-3"><dt className="font-semibold">Proposed experiment</dt><dd className="text-mute">{ai.proposedTest}</dd></div>
        </dl>
      )}
      {notice && <p className="text-sm text-warn">{notice}</p>}
      {comparison && <div className="space-y-2 border-t border-line pt-3">
        <h3 className="font-semibold">Measured Earth vs. orbit outcomes</h3>
        {comparison.rows.length ? <>
          <div className="ea-table-scroll overflow-x-auto" tabIndex={0} role="region" aria-label="Saffire-II measured outcomes">
            <table className="data min-w-[34rem]">
              <thead><tr><th scope="col">Sample</th><th scope="col">Conditions</th><th scope="col">Earth · 1 g</th><th scope="col">Orbit · µg</th></tr></thead>
              <tbody>{comparison.rows.map((row) => <tr key={row.locator}>
                <th scope="row">{row.sample} · {row.material}<span className="block text-xs text-mute">{row.thickness}</span></th>
                <td>O₂ {row.oxygen ? `${row.oxygen}%` : "—"} · {row.flow}</td>
                <td>{row.earth || "—"}</td><td>{row.orbit || "—"}</td>
              </tr>)}</tbody>
            </table>
          </div>
          <a className="ea-source-link underline" href="https://doi.org/10.60555/2chp-m469">NASA Saffire-II · PSI-99 ↗</a>
          <details><summary className="cursor-pointer text-sm">Test-row locations and caveats</summary>
            <ul className="list-disc space-y-1 pl-5 text-xs text-mute">
              {comparison.rows.map((row) => <li key={row.locator}>{row.sample}: {row.locator}</li>)}
              {comparison.caveats.map((note) => <li key={note}>{note}</li>)}
            </ul>
          </details>
        </> : <p className="text-sm text-mute">No measured Saffire-II comparison is available here for the selected material. See the ranked studies for other evidence.</p>}
      </div>}
      {scenario && <button type="button" className="btn" onClick={onOpenDraft}>Review this draft in Simulator →</button>}
    </section>
  );
}
