"use client";
// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// CENTER column: Run, playback, schematic, charts, Compare and the Saffire replay overlay with its error metrics.
import { useEffect, useRef, useState } from "react";
import { runInWorker } from "@/lib/sim/runInWorker";
import { rankEvidence } from "@/lib/sim/evidence";
import { replayError } from "@/lib/sim/replay";
import type { Scenario, SimResult } from "@/lib/sim/types";
import { sig } from "@/lib/ui/format";
import { Charts } from "./Charts";
import { Schematic } from "./Schematic";
import { TELEMETRY } from "./data";
import { useSim } from "./store";

const MC_N = 200;

/** Fields the engine cannot run without (unsourced values the user must supply). */
export function missingFields(s: Scenario | null): string[] {
  if (!s) return ["scenario"];
  const m: string[] = [];
  if (s.cabin.V_m3 == null) m.push("cabin free volume");
  return m;
}

/** Trim a result for the interpretation request: outcome, events, warnings, provenance and a ≤ 61-point series. */
function compact(r: SimResult) {
  const step = Math.max(1, Math.ceil(r.t.length / 60));
  const idx = r.t.map((_, i) => i).filter((i) => i % step === 0 || i === r.t.length - 1);
  return { outcome: r.outcome, events: r.events, warnings: r.warnings, provenance: r.provenance, t: idx.map((i) => r.t[i]), state: idx.map((i) => r.state[i]) };
}

/** Match InterpretRequestSchema: role as one string, no null DOI, summary ≤ 600 chars. */
const evidenceForAI = (s: Scenario) => rankEvidence(s).map((e) => ({
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
    if (!res.ok) set({ interp: { state: "error", error: j.error ?? `Interpretation unavailable (${res.status})` } });
    else set({ interp: { state: "ok", text: j.text, citations: j.citations ?? [] } });
  } catch (e) { set({ interp: { state: "error", error: String(e) } }); }
}

export async function runAll() {
  const { a, b, set } = useSim.getState();
  if (!a || missingFields(a).length || (b && missingFields(b).length)) return;
  set({ running: true, runError: null, frame: 0, interp: { state: "idle" } });
  try {
    const [ra, rb] = await Promise.all([runInWorker(a, { mc: MC_N }), b ? runInWorker(b, { mc: MC_N }) : Promise.resolve(null)]);
    set({ ra, rb, running: false, frame: ra.t.length - 1 });
    void interpret(a, ra, b, rb);
  } catch (e) { set({ running: false, runError: String(e) }); }
}

export function RunPanel() {
  const { a, b, ra, rb, running, runError, frame, replay, set } = useSim();
  const [playing, setPlaying] = useState(false);
  const raf = useRef<number | null>(null);
  const missing = [...missingFields(a), ...(b ? missingFields(b).map((m) => `B: ${m}`) : [])];

  useEffect(() => {
    if (!playing || !ra) return;
    let last = performance.now();
    const tick = (now: number) => {
      const f = useSim.getState().frame;
      if (now - last > 30) { last = now; if (f >= ra.t.length - 1) { setPlaying(false); return; } set({ frame: f + 1 }); }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [playing, ra, set]);

  if (!a) return null;
  const err = replay && ra && TELEMETRY ? replayError(ra, TELEMETRY) : null;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="btn-accent px-6 py-3 text-[16px]" data-testid="run" disabled={running || missing.length > 0} onClick={runAll}
          aria-describedby={missing.length ? "run-missing" : undefined}>
          {running ? "Running 200 Monte Carlo runs…" : "▶ Run"}
        </button>
        <button type="button" className="btn" data-testid="compare" onClick={() => {
          if (b) set({ b: null, rb: null, editing: "a" });
          else set({ b: { ...structuredClone(a), name: `${a.name} (B)` }, rb: null, editing: "b" });
        }}>{b ? "Remove B" : "Compare: duplicate as B"}</button>
        {missing.length > 0 && <p id="run-missing" className="text-[13px] text-warn">Enter {missing.join(", ")} to run: there is no sourced value.</p>}
        {runError && <p className="text-[13px] text-bad" role="alert">Run failed: {runError}</p>}
      </div>

      {ra && (
        <div className="flex items-center gap-2">
          <button type="button" className="btn" onClick={() => { if (frame >= ra.t.length - 1) set({ frame: 0 }); setPlaying(!playing); }} aria-label={playing ? "Pause" : "Play"}>{playing ? "❚❚" : "▶"}</button>
          <input type="range" className="flex-1" min={0} max={ra.t.length - 1} value={frame} aria-label="Playback time"
            onChange={(e) => { setPlaying(false); set({ frame: Number(e.target.value) }); }} />
          <span className="num w-16 text-right text-[13px]">{sig(ra.t[frame] ?? 0, 3)} s</span>
        </div>
      )}

      <div className={`grid gap-2 ${b ? "md:grid-cols-2" : ""}`}>
        <div className="panel p-2"><Schematic sc={a} r={ra} frame={frame} label={b ? `A · ${a.name}` : a.name} /></div>
        {b && <div className="panel p-2"><Schematic sc={b} r={rb} frame={Math.min(frame, (rb?.t.length ?? 1) - 1)} label={`B · ${b.name}`} /></div>}
      </div>

      {ra ? <Charts ra={ra} rb={rb} sa={a} frame={frame} replay={replay} />
        : <p className="panel p-6 text-center text-[14px] text-mute">Press ▶ Run to simulate {a.t_end_s} s of this cabin (200 Monte Carlo runs for the uncertainty bands).</p>}

      {replay && ra && (
        <section className="panel p-3" data-testid="telemetry-overlay">
          <p className="label">Saffire replay: simulation vs real NASA telemetry</p>
          <p className="mt-1 text-[13px] text-mute">Open circles are measured values from {TELEMETRY?.source_id ?? "PSI-100"} · {TELEMETRY?.locator ?? "telemetry not ingested"}. Lines are the simulation. The error is shown as computed, good or bad.</p>
          <ReplayMetrics err={err} />
        </section>
      )}
    </div>
  );
}

/** Render replayError() output as a table, whatever its exact nesting. */
function ReplayMetrics({ err }: { err: unknown }) {
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
