"use client";
// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Shared simulator pieces: result number + receipt, sections, fields, badges, the run helpers
// (missing fields, Monte Carlo run, interpretation) and the result panels Workspace renders.
import { useMemo, useState } from "react";
import { bandSig, fmtBand, sig } from "@/lib/ui/format";
import type { Band, OutcomeMetric, Provenance, Scenario, SimResult } from "@/lib/sim/types";
import { runInWorker } from "@/lib/sim/runInWorker";
import { rankEvidence } from "@/lib/sim/evidence";
import { sensitivity } from "@/lib/sim/sensitivity";
import { nextTest } from "@/lib/sim/nextTest";
import { localInterpret } from "@/lib/ai/localInterpret";
import type { PlotParams } from "react-plotly.js";
import { Plot } from "@/components/Plot";
import { OKABE_ITO } from "@/lib/ui/palette";
import { catalogEntry, doiUrl, psiUrl } from "./data";
import { keyOf, useSim } from "./store";

/** A result number: always a button that opens its receipt (provenance). */
export function Num({ value, units, band, title, sources, note, className = "" }: {
  value: number | null | undefined; units: string; band?: Band; title: string; sources: Provenance[]; note?: string; className?: string;
}) {
  const set = useSim((s) => s.set);
  const s = band && value != null ? bandSig(value, band.p05, band.p95) : 3;
  return (
    <button type="button" data-receipt={title} className={`num text-left underline decoration-dotted decoration-faint underline-offset-4 hover:decoration-ink ${className}`}
      onClick={() => set({ receipt: { title, value: value ?? null, units, band, sources, note } })}
      aria-label={`${title}: ${value == null ? "no data" : sig(value, s)} ${units}. Open receipt`}>
      {value == null ? "∅" : sig(value, s)}{units && <span className="ml-1 text-[12px] text-mute">{units}</span>}
      {band && value != null && <span className="ml-1 text-[12px] text-mute">{fmtBand(band.p05, band.p95, s)}</span>}
    </button>
  );
}

export function Section({ title, children, open: initial = true, right, testid, id }: { title: string; children: React.ReactNode; open?: boolean; right?: React.ReactNode; testid?: string; id?: string }) {
  const [open, setOpen] = useState(initial);
  return (
    <section className="scroll-mt-2 border-b border-line py-2" data-testid={testid} id={id}>
      <div className="flex items-center justify-between gap-2">
        <button type="button" className="label flex items-center gap-1 py-1 hover:text-ink" aria-expanded={open} onClick={() => setOpen(!open)}>
          <span aria-hidden className="inline-block w-3">{open ? "▾" : "▸"}</span>{title}
        </button>
        {right}
      </div>
      {open && <div className="space-y-2 pb-1 pt-1">{children}</div>}
    </section>
  );
}

/** Labelled numeric field with units; `source` shows on hover. Values are converted at I/O by `toSI`/`fromSI`. */
export function NumField({ label, value, units, onChange, source, step = "any", min, max, required, testid }: {
  label: string; value: number | null; units: string; onChange: (v: number | null) => void; source?: string;
  step?: number | "any"; min?: number; max?: number; required?: boolean; testid?: string;
}) {
  const missing = required && (value == null || !Number.isFinite(value));
  return (
    <label className="grid grid-cols-[1fr_auto] items-center gap-2 text-[13px]" title={source ?? "User input"}>
      <span className={missing ? "text-warn" : "text-mute"}>{label}{missing && " (required: no sourced value)"}</span>
      <span className="flex items-center gap-1">
        <input type="number" className="num w-24 text-right" value={value == null || !Number.isFinite(value) ? "" : value} step={step} min={min} max={max}
          data-testid={testid} aria-invalid={missing || undefined}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))} />
        <span className="w-12 text-[12px] text-faint">{units}</span>
      </span>
    </label>
  );
}

export function TheoryBadge({ what }: { what: string }) {
  // Links straight to the model's section in Methods (what it is, why it is uncalibrated, which data would calibrate it).
  return <a href={methodsHref(what)} className="chip border border-dashed border-theory/60 text-theory hover:border-theory" title={`${what}: not calibrated against PSI data; theory only. Open its Methods section`}>◌ Theory-only · {what} <span aria-hidden>→</span></a>;
}
export function BoundedBadge() {
  return <span className="chip border border-warn/50 text-warn" title="Partial gravity (1/6 g) is estimated between µg and 1 g. NASA's FM2 lunar-gravity tests show some materials burn more readily at lunar g than at either, so this estimate may be non-conservative.">Partial gravity: estimate, may be non-conservative</span>;
}

/** Methods anchor for a sub-model key (spread, habitat, smoke, suppression); unknown keys go to the model overview. */
export const methodsHref = (what: string) => ["spread", "habitat", "smoke", "suppression"].includes(what) ? `/methods#model-${what}` : "/methods#overview";

/* ---------- run helpers (formerly RunPanel) ---------- */
export const MC_N = 200;

/** Fields the engine cannot run without (unsourced values the user must supply). */
export function missingFields(s: Scenario | null): string[] {
  if (!s) return ["scenario"];
  const m: string[] = [];
  if (s.cabin.V_m3 == null) m.push("cabin free volume");
  return m;
}

/** Trim a result for the interpretation request: outcome, events, warnings, provenance and a ≤ 61-point series. */
export function compact(r: SimResult) {
  const step = Math.max(1, Math.ceil(r.t.length / 60));
  const idx = r.t.map((_, i) => i).filter((i) => i % step === 0 || i === r.t.length - 1);
  return { outcome: r.outcome, events: r.events, warnings: r.warnings, provenance: r.provenance, t: idx.map((i) => r.t[i]), state: idx.map((i) => r.state[i]) };
}

/** Match InterpretRequestSchema: role as one string, no null DOI, summary ≤ 600 chars. */
export const evidenceForAI = (s: Scenario) => rankEvidence(s).map((e) => ({
  accession: e.accession, title: e.title, summary: e.summary?.slice(0, 600), role: e.role.join(", ").slice(0, 40), ...(e.doi ? { doi: e.doi } : {}),
}));

export async function interpret(a: Scenario, ra: SimResult, b: Scenario | null, rb: SimResult | null) {
  const set = useSim.getState().set;
  set({ interp: { state: "loading" } });
  try {
    const res = await fetch("/api/interpret", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scenario: a, result: compact(ra), evidence: evidenceForAI(a), ...(b && rb && { compare: { scenario: b, result: compact(rb) } }) }),
    });
    const j = await res.json().catch(() => ({}));
    if (useSim.getState().ra !== ra) return;
    if (!res.ok) set({ interp: { state: "error", error: `${j.error ?? `Interpretation unavailable (${res.status})`} · ${localInterpret(a, ra)}` } });
    else set({ interp: { state: "ok", text: j.text, citations: j.citations ?? [] } });
  } catch (e) {
    if (useSim.getState().ra === ra) set({ interp: { state: "error", error: `${String(e)} · ${localInterpret(a, ra)}` } });
  }
}

/** The one Play action (toolbar and viewport): run first if there is no result or the inputs changed, then play
 *  from the start like a video; pause if playing; restart if at the end. */
export async function playPause() {
  const s = useSim.getState();
  if (s.running || !s.a) return;
  if (s.playing) { s.set({ playing: false }); return; }
  if (!s.ra || (s.b && !s.rb) || s.ranKey !== keyOf(s.a, s.b)) {
    await runAll();
    if (useSim.getState().ra) useSim.getState().set({ frame: 0, playing: true });
    return;
  }
  s.set({ frame: s.frame >= s.ra.t.length - 1 ? 0 : s.frame, playing: true });
}

export const runInputs = new WeakMap<SimResult, Scenario>();

export async function runAll() {
  const { a, b, set } = useSim.getState();
  if (!a || missingFields(a).length || (b && missingFields(b).length)) return;
  set({ running: true, runError: null, frame: 0, playing: false, interp: { state: "idle" } });
  try {
    const [ra, rb] = await Promise.all([runInWorker(a, { mc: MC_N }), b ? runInWorker(b, { mc: MC_N }) : Promise.resolve(null)]);
    runInputs.set(ra, a);
    if (rb && b) runInputs.set(rb, b);
    set({ ra, rb, running: false, frame: ra.t.length - 1, ranKey: keyOf(a, b) });
    void interpret(a, ra, b, rb);
  } catch (e) { set({ running: false, runError: String(e) }); }
}

/** Render replayError() output as a table, whatever its exact nesting. */
export function ReplayMetrics({ err }: { err: unknown }) {
  if (!err || typeof err !== "object") return <p className="mt-2 text-[13px] text-warn">No overlapping telemetry channel: error not computable.</p>;
  const entries = Object.entries(err as Record<string, unknown>);
  const nested = entries.filter(([, v]) => v && typeof v === "object" && !Array.isArray(v)) as [string, Record<string, unknown>][];
  if (!nested.length) return <dl className="mt-2 grid grid-cols-2 gap-x-4 text-[13px]">{entries.map(([k, v]) => <div key={k} className="contents"><dt className="text-mute">{k}</dt><dd className="num">{typeof v === "number" ? sig(v) : String(v)}</dd></div>)}</dl>;
  const cols = [...new Set(nested.flatMap(([, v]) => Object.keys(v)))];
  return (
    <table className="data mt-2"><thead><tr><th>channel</th>{cols.map((c) => <th key={c}>{c}</th>)}</tr></thead>
      <tbody>{nested.map(([k, v]) => <tr key={k}><td>{k}</td>{cols.map((c) => <td key={c} className="num">{typeof v[c] === "number" ? sig(v[c] as number) : String(v[c] ?? "—")}</td>)}</tr>)}</tbody></table>
  );
}

/* ---------- result panels (formerly ResultPanel) ---------- */
/* eslint-disable @typescript-eslint/no-explicit-any */
export const metricSources = (m: OutcomeMetric, r: SimResult): Provenance[] => [
  { source_id: "engine run", note: `EmberAtlas ${r.provenance.engine_version}, seed ${r.provenance.seed}${r.bands ? ", 200 Monte Carlo runs (p05–p95)" : ""}` },
  ...(m.limit_source ? [{ source_id: m.limit_source, note: `limit ${sig(m.limit ?? null)} ${m.units}` }] : []),
  ...r.provenance.sources,
];

export function Outcome({ sc, r, label }: { sc: Scenario; r: SimResult | null; label: string | null }) {
  const partial = sc.cabin.gravity_g > 0 && sc.cabin.gravity_g < 1;
  const theory = r ? Object.entries(r.provenance.params).filter(([, p]) => !p.calibrated) : [];
  return (
    <section className="space-y-2 border-b border-line pb-2" data-testid="outcome-card">
      <p className="label">Outcome{label && ` · ${label} · ${sc.name}`}</p>
      {!r ? <p className="text-[13px] text-mute">Run the scenario to see the outcome.</p> : (
        <>
          <table className="data">
            <tbody>
              {r.outcome.metrics.map((m) => (
                <tr key={m.key}>
                  <td className="text-mute">{m.label}</td>
                  <td className="[overflow-wrap:anywhere]">{m.key === "time_to_alarm" && m.value == null && sc.detection.threshold == null && sc.detection.manual_alarm_s == null
                    ? <span className="text-[12px] text-faint">No data (no sourced detector threshold)</span>
                    : <Num value={m.value} units={m.units} band={m.band} title={`${label ? `${label}: ` : ""}${m.label}`} sources={metricSources(m, r)} />}</td>
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

export function Interpretation() {
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

export function Evidence({ sc }: { sc: Scenario }) {
  const ranked = useMemo(() => rankEvidence(sc) as any[], [sc]);
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
      <p className="pt-2 text-[12px] text-mute">Earth test vs orbit and where the tested envelope stops: <a className="underline underline-offset-2" href="/evidence">Evidence</a>.</p>
    </Section>
  );
}

const OUTCOME_KEYS = [["peak_co", "Peak CO"], ["time_to_alarm", "Time to alarm"], ["peak_T", "Peak temperature"], ["min_o2", "Minimum O₂"], ["time_to_extinguish", "Time to extinguish"]] as const;

export function Tornado({ sc }: { sc: Scenario }) {
  const [key, setKey] = useState<string>(OUTCOME_KEYS[0][0]);
  const [rows, setRows] = useState<{ param: string; label: string; low: number | null; high: number | null; base: number | null }[] | null>(null);
  const [busy, setBusy] = useState(false);
  const setSim = useSim((s) => s.set);
  const run = () => { setBusy(true); setTimeout(() => { try { const r = sensitivity(sc, key) as any; setRows(r); setSim({ sens: { scenario: sc, key, rows: r } }); } finally { setBusy(false); } }, 10); };
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

export function NextTest({ sc, r }: { sc: Scenario; r: SimResult }) {
  const nt = useMemo(() => nextTest(sc, r) as any, [sc, r]);
  return (
    <Section title="Next test to fly" id="next-test" testid="next-test">
      {!nt ? <p className="text-[13px] text-mute">Inside the tested envelope, no new test needed for this scenario</p> : (
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

export function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const el = Object.assign(document.createElement("a"), { href: url, download: name });
  el.click();
  URL.revokeObjectURL(url);
}

