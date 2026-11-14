"use client";
// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// RIGHT column: outcome, AI interpretation, evidence, what matters most, next test, export.
import { useMemo, useState } from "react";
import { earthVsOrbit, rankEvidence } from "@/lib/sim/evidence";
import { sensitivity } from "@/lib/sim/sensitivity";
import { nextTest } from "@/lib/sim/nextTest";
import { exportPsiRowsCsv, exportScenarioJson, exportSeriesCsv } from "@/lib/sim/export";
import type { OutcomeMetric, Provenance, Scenario, SimResult } from "@/lib/sim/types";
import type { PlotParams } from "react-plotly.js";
import { Plot } from "@/components/Plot";
import { OKABE_ITO } from "@/lib/ui/palette";
import { sig } from "@/lib/ui/format";
import { catalogEntry, doiUrl, psiUrl } from "./data";
import { Num, Section, TheoryBadge, BoundedBadge } from "./bits";
import { useSim } from "./store";

/* eslint-disable @typescript-eslint/no-explicit-any */
const metricSources = (m: OutcomeMetric, r: SimResult): Provenance[] => [
  { source_id: "engine run", note: `EmberAtlas ${r.provenance.engine_version}, seed ${r.provenance.seed}${r.bands ? ", 200 Monte Carlo runs (p05–p95)" : ""}` },
  ...(m.limit_source ? [{ source_id: m.limit_source, note: `limit ${sig(m.limit ?? null)} ${m.units}` }] : []),
  ...r.provenance.sources,
];

export function ResultPanel() {
  const { a, b, ra, rb } = useSim();
  if (!a) return null;
  return (
    <div className="space-y-1">
      <Outcome sc={a} r={ra} label={b ? "A" : null} />
      {b && rb && <Outcome sc={b} r={rb} label="B" />}
      <Interpretation />
      <Evidence sc={a} />
      <Tornado sc={a} />
      {ra && <NextTest sc={a} r={ra} />}
      {ra && <Export sc={a} r={ra} />}
    </div>
  );
}

function Outcome({ sc, r, label }: { sc: Scenario; r: SimResult | null; label: string | null }) {
  const partial = sc.cabin.gravity_g > 0 && sc.cabin.gravity_g < 1;
  const theory = r ? Object.entries(r.provenance.params).filter(([, p]) => !p.calibrated) : [];
  return (
    <section className="card space-y-2" data-testid="outcome-card">
      <p className="label">Outcome{label && ` · ${label} · ${sc.name}`}</p>
      {!r ? <p className="text-[13px] text-mute">Run the scenario to see the outcome.</p> : (
        <>
          <table className="data">
            <tbody>
              {r.outcome.metrics.map((m) => (
                <tr key={m.key}>
                  <td className="text-mute">{m.label}</td>
                  <td><Num value={m.value} units={m.units} band={m.band} title={`${label ? `${label}: ` : ""}${m.label}`} sources={metricSources(m, r)} /></td>
                  <td className="text-right">{m.pass == null ? <span className="text-[12px] text-faint" title="No sourced limit for this quantity">no sourced limit</span>
                    : m.pass ? <span className="chip border border-ok/40 text-ok" title={m.limit_source}>PASS</span>
                      : <span className="chip border border-bad/50 text-bad" title={m.limit_source}>FAIL</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {r.outcome.probabilities?.length ? (
            <ul className="space-y-0.5 text-[13px]">
              {r.outcome.probabilities.map((p) => (
                <li key={p.key}>{p.label} in{" "}
                  <Num value={p.p * 100} units="% of runs" title={p.label} sources={[{ source_id: "engine run", note: `fraction of Monte Carlo runs, seed ${r.provenance.seed}` }]} />
                </li>
              ))}
            </ul>
          ) : null}
          <div className="flex flex-wrap gap-1">
            {theory.map(([k]) => <TheoryBadge key={k} what={k} />)}
            {partial && <BoundedBadge />}
          </div>
          {r.warnings.length > 0 && <ul className="space-y-0.5 text-[12px] text-warn">{r.warnings.map((w, i) => <li key={i}>⚠ {w}</li>)}</ul>}
          {r.events.length > 0 && (
            <details className="text-[12px]"><summary className="cursor-pointer text-mute">Event log ({r.events.length})</summary>
              <ul className="num mt-1 space-y-0.5">{r.events.map((e, i) => <li key={i}>{sig(e.t_s, 3)} s · {e.kind.replace("_", " ")} {e.item_id ? `(${e.item_id})` : ""} · <span className="font-sans text-mute">{e.detail}</span></li>)}</ul>
            </details>
          )}
        </>
      )}
    </section>
  );
}

function Interpretation() {
  const { interp, ra } = useSim();
  return (
    <Section title="AI interpretation" testid="interpretation">
      {!ra && <p className="text-[13px] text-mute">Appears after a run.</p>}
      {interp.state === "loading" && <p className="text-[13px] text-mute">Interpreting the engine results…</p>}
      {interp.state === "error" && <p className="text-[13px] text-warn" role="status">{interp.error}</p>}
      {interp.state === "ok" && <>
        <p className="measure whitespace-pre-line text-[14px]">{interp.text}</p>
        {interp.citations?.length ? <p className="text-[12px] text-mute">Cites: {interp.citations.join(" · ")}</p> : null}
      </>}
      <p className="text-[12px] text-faint">AI-generated from engine results and cited PSI data.</p>
    </Section>
  );
}

function Evidence({ sc }: { sc: Scenario }) {
  const ranked = useMemo(() => rankEvidence(sc) as any[], [sc]);
  const evo = useMemo(() => earthVsOrbit(sc.items.map((i) => i.material_key)) as any, [sc]);
  const evoRows: any[] = Array.isArray(evo) ? evo : evo?.rows ?? [];
  return (
    <Section title="Evidence behind this run" testid="evidence-list">
      <p className="text-[12px] text-mute">PSI investigations ranked by how closely their test conditions match this scenario.</p>
      <ol className="space-y-2">
        {ranked.map((e, i) => {
          const acc: string = e.accession ?? e.source_id;
          const cat = catalogEntry(acc);
          const doi = doiUrl(e.doi ?? cat?.doi);
          return (
            <li key={acc + i} className="border-l-2 border-line pl-2 text-[13px]">
              <p><span className="num text-faint">{i + 1}.</span> <span className="num">{acc}</span> · <span className="font-medium">{e.title ?? cat?.short_name ?? cat?.title}</span>
                {e.role && <span className="chip ml-1 border border-line text-mute">{Array.isArray(e.role) ? e.role.join(" / ") : e.role}</span>}</p>
              {(e.summary ?? cat?.title) && <p className="text-mute">{e.summary ?? cat?.title}</p>}
              {e.why && <p className="text-[12px] text-faint">{e.why}</p>}
              <p className="text-[12px]"><a className="underline underline-offset-2" href={e.url ?? psiUrl(acc)} target="_blank" rel="noreferrer">PSI record</a>
                {doi && <> · <a className="underline underline-offset-2" href={doi} target="_blank" rel="noreferrer">DOI</a></>}</p>
            </li>
          );
        })}
        {!ranked.length && <li className="text-[13px] text-mute">∅ No PSI investigation matches these conditions.</li>}
      </ol>
      <div className="pt-2">
        <p className="label">Earth test vs orbit (SAFFIRE-II, like-for-like)</p>
        {evoRows.length ? (
          <>
            <table className="data"><thead><tr><th>material</th><th>thickness</th><th>O₂ · flow</th><th>1 g</th><th>µg</th></tr></thead>
              <tbody>{evoRows.map((r, i) => (
                <tr key={i} title={r.locator}><td>{r.material}</td><td className="num">{r.thickness}</td>
                  <td className="num">{r.o2_raw ?? sig(r.x_o2_lo * 100)}% · {sig(r.flow_cm_s)} cm/s {r.flow_direction?.toLowerCase()}</td>
                  <td>{r.g1_burn_length}</td><td>{r.ug_burn_length}</td></tr>))}</tbody></table>
            <p className="text-[12px] text-warn">Small n: one test per material and thickness ({evoRows[0]?.source_id ?? "PSI-99"}). Never a verdict on a ground test standard.</p>
            {(evo?.caveats ?? []).map((c: string, i: number) => <p key={i} className="text-[12px] text-mute">{c}</p>)}
          </>
        ) : <p className="text-[13px] text-mute">∅ No like-for-like Earth-vs-orbit rows for the chosen materials.</p>}
      </div>
    </Section>
  );
}

const OUTCOME_KEYS = [["peak_co", "Peak CO"], ["time_to_alarm", "Time to alarm"], ["peak_T", "Peak temperature"], ["min_o2", "Minimum O₂"], ["time_to_extinguish", "Time to extinguish"]] as const;

function Tornado({ sc }: { sc: Scenario }) {
  const [key, setKey] = useState<string>(OUTCOME_KEYS[0][0]);
  const [rows, setRows] = useState<{ param: string; label: string; low: number | null; high: number | null; base: number | null }[] | null>(null);
  const [busy, setBusy] = useState(false);
  const run = () => { setBusy(true); setTimeout(() => { try { setRows(sensitivity(sc, key) as any); } finally { setBusy(false); } }, 10); };
  const valid = (rows ?? []).filter((r) => r.low != null && r.high != null && r.base != null)
    .sort((x, y) => Math.abs(x.high! - x.low!) - Math.abs(y.high! - y.low!));
  const base = valid[0]?.base ?? 0;
  return (
    <Section title="What matters most">
      <div className="flex flex-wrap items-center gap-2">
        <select aria-label="Outcome" value={key} onChange={(e) => { setKey(e.target.value); setRows(null); }}>
          {OUTCOME_KEYS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <button type="button" className="btn" onClick={run} disabled={busy}>{busy ? "Running…" : "Find what matters most"}</button>
      </div>
      {rows && (valid.length ? (
        <Plot height={60 + valid.length * 34} label="Sensitivity tornado chart"
          data={([
            { type: "bar", orientation: "h", y: valid.map((r) => r.label), x: valid.map((r) => r.low! - base), base, name: "low input", marker: { color: OKABE_ITO[4] } },
            { type: "bar", orientation: "h", y: valid.map((r) => r.label), x: valid.map((r) => r.high! - base), base, name: "high input", marker: { color: OKABE_ITO[5] } },
          ] as unknown as PlotParams["data"])}
          layout={{ barmode: "overlay", margin: { l: 120, r: 12, t: 8, b: 36 }, xaxis: { title: { text: OUTCOME_KEYS.find((o) => o[0] === key)?.[1] } } }} />
      ) : <p className="text-[13px] text-mute">∅ This outcome did not occur in the swept runs, so there is no swing to show.</p>)}
    </Section>
  );
}

function NextTest({ sc, r }: { sc: Scenario; r: SimResult }) {
  const nt = useMemo(() => nextTest(sc, r) as any, [sc, r]);
  return (
    <Section title="Next test to fly">
      {!nt ? <p className="text-[13px] text-mute">Every condition in this scenario sits inside the PSI-tested envelope.</p> : (
        <div className="space-y-1 text-[13px]">
          <p className="font-medium">{nt.condition}</p>
          <p className="text-mute">{nt.why}</p>
          {nt.rig && <p>Suggested rig: {nt.rig}</p>}
          {nt.investigations?.length ? <p className="text-[12px] text-faint">Nearest evidence: {nt.investigations.join(", ")}</p> : null}
        </div>
      )}
    </Section>
  );
}

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const el = Object.assign(document.createElement("a"), { href: url, download: name });
  el.click();
  URL.revokeObjectURL(url);
}

function Export({ sc, r }: { sc: Scenario; r: SimResult }) {
  const slug = sc.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "scenario";
  return (
    <Section title="Export">
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn" onClick={() => download(`${slug}_psi_rows.csv`, exportPsiRowsCsv(sc, r), "text/csv")}>PSI test rows (CSV)</button>
        <button type="button" className="btn" onClick={() => download(`${slug}_series.csv`, exportSeriesCsv(r), "text/csv")}>Simulation series (CSV)</button>
        <button type="button" className="btn" onClick={() => download(`${slug}_scenario.json`, exportScenarioJson(sc), "application/json")}>Scenario (JSON)</button>
        <button type="button" className="btn" onClick={() => window.print()}>Print one-page report</button>
      </div>
    </Section>
  );
}
