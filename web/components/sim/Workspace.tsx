"use client";
// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Simulation Hub: full-height engineering workspace (desktop-first, no page scroll while simulating).
// Toolbar · left project tree + scenario setup + saved states · center cabin viewport + (Compare) delta card + chart dock · right outputs/evidence/interpretation.
// Reuses the existing engine (runAll), receipts (Num), outcome/evidence/sensitivity/next-test panels and manual setup.
import { useEffect, useRef, useState } from "react";
import { PRESETS } from "@/lib/sim/presets";
import { replayError } from "@/lib/sim/replay";
import { exportPsiRowsCsv, exportScenarioJson, exportSeriesCsv } from "@/lib/sim/export";
import { ScenarioSchema, type Scenario, type SimResult } from "@/lib/sim/types";
import { lsGet, lsSet } from "@/lib/store";
import { sig } from "@/lib/ui/format";
import { CHARTS, Charts } from "./Charts";
import { CabinView, Legend, runFacts, useReducedMotion } from "./CabinView";
import { ScenarioPanel, applyPreset, fmtProv } from "./ScenarioPanel";
import { TELEMETRY, materialByKey } from "./data";
import { BoundedBadge, Evidence, Interpretation, MC_N, NextTest, Outcome, ReplayMetrics, TheoryBadge, Tornado, download, missingFields, runAll } from "./bits";
import { nextTest, outOfEnvelope } from "@/lib/sim/nextTest";
import spreadCal from "@/data/params/spread.json";
import { LAYERS, useSim } from "./store";

export function Workspace() {
  usePlayback();
  const [inspectorOpen, setInspectorOpen] = useState(false);
  return (
    <div className="flex flex-col gap-2 lg:fixed lg:inset-x-0 lg:bottom-0 lg:top-14 lg:z-30 lg:gap-0 lg:bg-bg print:static" data-testid="workspace">
      <Toolbar inspectorOpen={inspectorOpen} onToggleInspector={() => setInspectorOpen((v) => !v)} />
      <NextStep inspectorOpen={inspectorOpen} openInspector={() => setInspectorOpen(true)} />
      <div className={`grid min-h-0 flex-1 gap-2 lg:gap-0 ${inspectorOpen ? "lg:grid-cols-[288px_minmax(0,1fr)_384px]" : "lg:grid-cols-[288px_minmax(0,1fr)]"}`}>
        <aside className="min-h-0 overflow-y-auto border-line px-3 pb-3 lg:border-r" data-noprint aria-label="Project and scenario setup">
          <ProjectTree />
          <details id="setup-details" className="border-b border-line" open={false}>
            <summary className="cursor-pointer list-none py-2 text-[12px] font-medium text-mute hover:text-ink">
              <span className="mr-2 text-faint">▸</span>Scenario setup
            </summary>
            <div className="pb-2"><ScenarioPanel /></div>
          </details>
          <details className="border-b border-line" open={false}>
            <summary className="cursor-pointer list-none py-2 text-[12px] font-medium text-mute hover:text-ink"><span className="mr-2 text-faint">▸</span>Saved states</summary>
            <SavedStates />
          </details>
        </aside>
        <Center openInspector={() => setInspectorOpen(true)} />
        <aside className={`flex min-h-0 flex-col border-line lg:border-l ${inspectorOpen ? "" : "hidden"}`} aria-label="Outputs, evidence and interpretation"><RightPanel /></aside>
      </div>
      <StatusBar />
    </div>
  );
}

/* ---------- missing inputs and the one next step ---------- */
const FIELD_FOR: Record<string, string> = { "cabin free volume": "volume" };

/** Open Scenario setup (for A or B) and focus the first missing field, so a disabled Run explains itself. */
function revealMissing(label: string) {
  const isB = label.startsWith("B: ");
  useSim.getState().set({ editing: isB ? "b" : "a" });
  const details = document.getElementById("setup-details") as HTMLDetailsElement | null;
  if (details) details.open = true;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const el = document.querySelector<HTMLInputElement>(`[data-testid="${FIELD_FOR[label.replace(/^B: /, "")] ?? ""}"]`);
    el?.scrollIntoView({ block: "center" });
    el?.focus();
  }));
}

function NextStep({ inspectorOpen, openInspector }: { inspectorOpen: boolean; openInspector: () => void }) {
  const { a, b, ra, running, playing } = useSim();
  if (!a) return null;
  const missing = [...missingFields(a), ...(b ? missingFields(b).map((m) => `B: ${m}`) : [])];
  let text: React.ReactNode, action: React.ReactNode = null;
  if (missing.length) {
    text = <>Enter the <b>{missing.join(", ")}</b>: there is no sourced value. Then press ▶ Run.</>;
    action = <button type="button" className="btn px-2 py-0.5 text-[12px]" onClick={() => revealMissing(missing[0])}>Enter it</button>;
  } else if (running) text = <>Simulating {MC_N} Monte Carlo runs…</>;
  else if (!ra) text = <>Press <b>▶ Run</b> to simulate this cabin. Inputs and presets are in Scenario setup on the left.</>;
  else if (!inspectorOpen) {
    text = <>{playing ? "Playing back" : <>Press <b>▷</b> to play back</>} the cabin view, then open the results to see the sources behind them.</>;
    action = <button type="button" className="btn px-2 py-0.5 text-[12px]" onClick={openInspector}>Results &amp; evidence</button>;
  } else text = <>Scrub the timeline to follow the cabin view; the <b>Evidence</b> tab lists the NASA PSI sources behind this run.</>;
  return (
    <div className="next-step border-b border-line px-3 py-1" data-noprint data-testid="next-step">
      <span className="next-step__tag">Next step</span><span className="min-w-0">{text}</span>{action}
    </div>
  );
}

/* ---------- playback: advances the playhead through engine frames (data-driven, not decorative) ---------- */
function usePlayback() {
  const { playing, ra, set } = useSim();
  const reduced = useReducedMotion();
  const raf = useRef<number | null>(null);
  useEffect(() => {
    if (!playing || !ra) return;
    let last = performance.now();
    const step = reduced ? 120 : 33;
    const tick = (now: number) => {
      const f = useSim.getState().frame;
      if (now - last > step) { last = now; if (f >= ra.t.length - 1) { set({ playing: false }); return; } set({ frame: f + 1 }); }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [playing, ra, reduced, set]);
}

/* ---------- toolbar ---------- */
function Toolbar({ inspectorOpen, onToggleInspector }: { inspectorOpen: boolean; onToggleInspector: () => void }) {
  const { a, b, ra, rb, editing, running, playing, frame, view, set } = useSim();
  // Shared with /dashboard: ea.project = { name, description } (a legacy plain string is still read).
  const [project, setProject] = useState("Untitled project");
  const [desc, setDesc] = useState("");
  useEffect(() => {
    const p = lsGet<unknown>("ea.project", null);
    if (typeof p === "string") setProject(p);
    else if (p && typeof p === "object") { const o = p as { name?: unknown; description?: unknown }; if (typeof o.name === "string" && o.name) setProject(o.name); if (typeof o.description === "string") setDesc(o.description); }
  }, []);
  if (!a) return null;
  const missing = [...missingFields(a), ...(b ? missingFields(b).map((m) => `B: ${m}`) : [])];
  const last = ra ? ra.t.length - 1 : 0;
  const slug = a.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "scenario";
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-line bg-panel px-3 py-1.5 lg:h-11 lg:flex-nowrap lg:py-0" role="toolbar" aria-label="Simulation" data-noprint>
      <input type="text" aria-label="Project name" className="w-36 border-transparent bg-transparent font-medium hover:border-line" value={project}
        onChange={(e) => { setProject(e.target.value); lsSet("ea.project", { name: e.target.value, description: desc }); }} />
      <select aria-label="Scenario" className="max-w-[220px]" value={b ? editing : "a"} onChange={(e) => {
        const v = e.target.value;
        if (v === "a" || v === "b") set({ editing: v });
        else { const p = PRESETS.find((x) => x.id === v); if (p) applyPreset(p); }
      }}>
        <option value="a">{b ? "A · " : ""}{a.name}</option>
        {b && <option value="b">B · {b.name}</option>}
        <optgroup label="Load PSI preset">{PRESETS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}</optgroup>
      </select>
      <span className="h-5 w-px bg-line" aria-hidden />
      <button type="button" className="btn-accent px-4 py-1" data-testid="run" disabled={running || missing.length > 0} onClick={runAll}
        aria-describedby={missing.length ? "run-missing" : undefined}>{running ? `Running ${MC_N} runs…` : "▶ Run"}</button>
      {missing.length > 0 && <button type="button" id="run-missing" className="shrink-0 whitespace-nowrap text-[12px] text-warn underline decoration-dotted underline-offset-4"
        title="No sourced value exists for these inputs; enter them to enable Run" onClick={() => revealMissing(missing[0])}>Needs: {missing.join(", ")} →</button>}
      <button type="button" className="btn px-2" disabled={!ra} aria-label={playing ? "Pause" : "Play"} onClick={() => { if (!playing && frame >= last) set({ frame: 0 }); set({ playing: !playing }); }}>{playing ? "❚❚" : "▷"}</button>
      <button type="button" className="btn px-2" disabled={!ra} aria-label="Reset playhead" onClick={() => set({ playing: false, frame: 0 })}>⟲</button>
      <input type="range" className="min-w-[120px] flex-1" min={0} max={last} value={Math.min(frame, last)} disabled={!ra} aria-label="Simulation time"
        onChange={(e) => set({ playing: false, frame: Number(e.target.value) })} />
      <span className="num w-28 shrink-0 whitespace-nowrap text-right text-[12px]">{ra ? `${sig(ra.t[Math.min(frame, last)], 3)} / ${sig(ra.t[last], 3)} s` : "— s"}</span>
      <span className="h-5 w-px bg-line" aria-hidden />
      <div className="flex" role="group" aria-label="View">
        {(["elevation", "section"] as const).map((v) => <button key={v} type="button" aria-pressed={view === v} className={`btn px-2 py-1 text-[12px] ${view === v ? "bg-surface2" : ""}`} onClick={() => set({ view: v })}>{v === "elevation" ? "Elevation" : "Section"}</button>)}
      </div>
      <button type="button" className={`btn px-2 py-1 text-[12px] ${b ? "bg-surface2" : ""}`} data-testid="compare" aria-pressed={!!b} onClick={() => {
        if (b) set({ b: null, rb: null, editing: "a" });
        else set({ b: { ...structuredClone(a), name: `${a.name} (B)` }, rb: null, editing: "b" });
      }}>{b ? "Compare on · remove B" : "Compare"}</button>
      <button type="button" className={`btn px-2 py-1 text-[12px] ${inspectorOpen ? "bg-surface2" : ""}`} aria-expanded={inspectorOpen} onClick={onToggleInspector}>
        {inspectorOpen ? "Hide inspector" : "Results & evidence"}
      </button>
      <details className="relative">
        <summary className="btn cursor-pointer list-none px-2 py-1 text-[12px]">Export ▾</summary>
        <div className="absolute right-0 z-40 mt-1 flex w-52 flex-col gap-1 border border-line bg-panel p-2 shadow-xl" style={{ borderRadius: 6 }} role="menu">
          <button type="button" role="menuitem" className="btn justify-start" onClick={() => download(`${slug}_scenario.json`, exportScenarioJson(a), "application/json")}>Scenario (JSON)</button>
          <button type="button" role="menuitem" className="btn justify-start" disabled={!ra} onClick={() => ra && download(`${slug}_series.csv`, exportSeriesCsv(ra), "text/csv")}>Simulation series (CSV)</button>
          <button type="button" role="menuitem" className="btn justify-start" disabled={!ra} onClick={() => ra && download(`${slug}_psi_rows.csv`, exportPsiRowsCsv(a, ra), "text/csv")}>PSI test rows (CSV)</button>
          <button type="button" role="menuitem" className="btn justify-start" onClick={() => window.print()}>Print report</button>
          {rb && <p className="text-[11px] text-faint">Exports cover scenario A.</p>}
        </div>
      </details>
    </div>
  );
}

/* ---------- left: project tree + saved states ---------- */
const go = (id: string) => document.getElementById(id)?.scrollIntoView({ block: "start", behavior: "smooth" });

function ProjectTree() {
  const { a, b, editing, set } = useSim();
  if (!a) return null;
  const node = (sc: Scenario, tag: "a" | "b") => {
    const fire = sc.items.find((i) => i.ignite);
    const rows: [string, string, string][] = [
      ["Cabin", `${sig(sc.cabin.x_o2 * 100, 3)}% O₂ · ${sig(sc.cabin.P_Pa / 1e3, 3)} kPa · ${sig(sc.cabin.gravity_g, 3)} g`, "sec-cabin"],
      ["Materials", `${sc.items.length} item${sc.items.length === 1 ? "" : "s"}`, "sec-materials"],
      ["Fire sources", fire ? `${materialByKey(fire.material_key)?.display_name ?? fire.material_key} @ ${sig(fire.t_ignite_s, 3)} s` : "none", "sec-fire"],
      ["Detectors", `${sc.detection.type} · ${sig(sc.detection.distance_m, 3)} m · ${sc.detection.threshold == null ? "∅ threshold" : "threshold set"}`, "sec-detection"],
      ["Suppression", sc.suppression.agent === "none" ? "none" : `${sc.suppression.agent} · ${sig(sc.suppression.mass_kg, 3)} kg`, "sec-suppression"],
    ];
    return (
      <li key={tag}>
        <button type="button" className={`flex w-full items-center gap-1 px-1 py-0.5 text-left text-[13px] font-medium ${editing === tag || !b ? "text-ink" : "text-mute"}`}
          onClick={() => set({ editing: tag })}><span aria-hidden className="text-faint">▾</span>{b ? `${tag.toUpperCase()} · ` : ""}{sc.name}</button>
        <ul className="ml-3 border-l border-line pl-2">
          {rows.map(([k, v, id]) => (
            <li key={k}><button type="button" className="grid w-full grid-cols-[84px_minmax(0,1fr)] gap-1 py-0.5 text-left text-[12px] hover:text-ink" onClick={() => { set({ editing: tag }); go(id); }}>
              <span className="text-mute">{k}</span><span className="num truncate text-faint" title={v}>{v}</span></button></li>
          ))}
        </ul>
      </li>
    );
  };
  return (
    <nav className="border-b border-line py-2" aria-label="Scenario tree" data-testid="project-tree">
      <p className="label mb-1">Project</p>
      <ul className="space-y-1">{node(a, "a")}{b && node(b, "b")}
        <li><button type="button" className="px-1 py-0.5 text-left text-[12px] text-mute hover:text-ink" onClick={() => go("sec-saved")}>▸ Saved simulation states</button></li>
      </ul>
    </nav>
  );
}

interface Saved { id: string; name: string; saved_at: string; a: Scenario; b: Scenario | null }

function SavedStates() {
  const { a, b, set } = useSim();
  const [list, setList] = useState<Saved[]>([]);
  const [confirm, setConfirm] = useState<string | null>(null);
  useEffect(() => { setList(lsGet<Saved[]>("ea.saved", [])); }, []);
  const store = (l: Saved[]) => { setList(l); lsSet("ea.saved", l); };
  return (
    <section id="sec-saved" className="scroll-mt-2 py-2" data-testid="saved-states">
      <div className="flex items-center justify-between"><p className="label">Saved simulation states</p>
        <button type="button" className="btn px-2 py-0.5 text-[12px]" disabled={!a} onClick={() => a && store([{ id: `${Date.now()}`, name: b ? `${a.name} vs ${b.name}` : a.name, saved_at: new Date().toISOString(), a, b }, ...list].slice(0, 30))}>Save current</button></div>
      <p className="mt-1 text-[11px] text-faint">Scenario inputs only, in this browser. Loading re-runs nothing until you press Run.</p>
      <ul className="mt-1 space-y-1">
        {list.map((s) => (
          <li key={s.id} className="flex items-center gap-1 text-[12px]">
            <button type="button" className="min-w-0 flex-1 truncate text-left hover:underline" title={`Saved ${new Date(s.saved_at).toLocaleString()}`} onClick={() => {
              const pa = ScenarioSchema.safeParse(s.a), pb = s.b ? ScenarioSchema.safeParse(s.b) : null;
              if (!pa.success || (pb && !pb.success)) return;
              set({ a: pa.data, b: pb?.success ? pb.data : null, editing: "a", presetId: null, replay: false, ra: null, rb: null, frame: 0, playing: false, interp: { state: "idle" }, chat: [] });
            }}>{s.name}</button>
            {confirm === s.id ? <>
              <button type="button" className="text-bad" onClick={() => { store(list.filter((x) => x.id !== s.id)); setConfirm(null); }}>Delete</button>
              <button type="button" className="text-mute" onClick={() => setConfirm(null)}>Keep</button>
            </> : <button type="button" className="text-faint hover:text-ink" aria-label={`Delete ${s.name}`} onClick={() => setConfirm(s.id)}>✕</button>}
          </li>
        ))}
        {!list.length && <li className="text-[12px] text-faint">None saved.</li>}
      </ul>
    </section>
  );
}

/* ---------- center: viewport(s), layers, legend, assumptions drawer, chart dock ---------- */
function Center({ openInspector }: { openInspector: () => void }) {
  const { a, b, ra, rb, frame, runError, layers, assumptionsOpen, set } = useSim();
  if (!a) return null;
  const missing = [...missingFields(a), ...(b ? missingFields(b).map((m) => `B: ${m}`) : [])];
  return (
    <section className="flex min-h-0 flex-col" aria-label="Simulation viewport">
      <div className="flex flex-wrap items-center gap-1 border-b border-line px-2 py-1 text-[12px]" data-noprint>
        <span className="label mr-1">Layers</span>
        <details className="relative">
          <summary className="btn cursor-pointer list-none px-2 py-0.5 text-[12px]">Layers ▾</summary>
          <div className="absolute left-0 top-7 z-30 grid min-w-44 gap-1 border border-line bg-panel p-2 shadow-xl">
            {LAYERS.map((l) => <label key={l.k} className="flex items-center gap-1 px-1"><input type="checkbox" checked={layers[l.k]} onChange={(e) => set({ layers: { ...layers, [l.k]: e.target.checked } })} />{l.label}</label>)}
          </div>
        </details>
        <button type="button" className="btn ml-auto px-2 py-0.5 text-[12px]" aria-expanded={assumptionsOpen} onClick={() => set({ assumptionsOpen: !assumptionsOpen })}>Assumptions / evidence</button>
      </div>
      <div className="relative min-h-[320px] flex-1 lg:min-h-0">
        {missing.length > 0 && <p id="run-missing-note" className="absolute inset-x-2 top-2 z-10 border border-warn/50 bg-panel px-2 py-1 text-[13px] text-warn" style={{ borderRadius: 6 }}>Enter {missing.join(", ")} to run: there is no sourced value.</p>}
        {runError && <p className="absolute inset-x-2 top-10 z-10 bg-panel px-2 text-[13px] text-bad" role="alert">Run failed: {runError}</p>}
        <div className={`grid h-full ${b ? "grid-cols-2 divide-x divide-line" : ""}`}>
          <CabinView sc={a} r={ra} frame={frame} label={b ? `A · ${a.name}` : a.name} compact={!!b} />
          {b && <CabinView sc={b} r={rb} frame={frame} label={`B · ${b.name}`} compact />}
        </div>
        {assumptionsOpen && <Assumptions sc={a} r={ra} />}
      </div>
      <div className="border-t border-line px-3 py-1"><Legend /></div>
      {b && ra && rb && <DeltaCard a={a} b={b} ra={ra} rb={rb} openInspector={openInspector} />}
      <Dock />
    </section>
  );
}

function Assumptions({ sc, r }: { sc: Scenario; r: SimResult | null }) {
  const set = useSim((s) => s.set);
  const theory = r ? Object.entries(r.provenance.params).filter(([, p]) => !p.calibrated) : [];
  const partial = sc.cabin.gravity_g > 0 && sc.cabin.gravity_g < 1;
  return (
    <div className="absolute inset-y-0 right-0 z-20 w-[min(420px,100%)] overflow-y-auto border-l border-line bg-panel p-3 text-[13px] shadow-2xl" role="dialog" aria-label="Assumptions and evidence" data-testid="assumptions">
      <div className="flex items-center justify-between"><p className="label">Assumptions / evidence</p><button type="button" className="btn px-2 py-0.5" onClick={() => set({ assumptionsOpen: false })}>Close</button></div>
      <ul className="mt-2 list-disc space-y-1 pl-4 text-mute">
        <li>Engine: single well-mixed cabin zone (CFAST-like) with a 1-D flame front per item; partial gravity is bounded between µg and 1 g.</li>
        <li>Spread uses the opposed-flow equivalent velocity; the viewport draws ventilation opposite to spread accordingly.</li>
        <li>Smoke reaches the detector after τ = distance / flow (no transport when flow is 0); the detector reading is the lagged well-mixed concentration.</li>
        <li>Alarm only when the detector crosses its threshold or at a crew-reported time; with no threshold the alarm is not computed (No data).</li>
        <li>Agent release is instant and well-mixed (single zone). Fan-off stops transport.</li>
        <li>Drawn to scale: item length/width, flame front, burning length, detector distance. Schematic: module interior (hull, racks, bulkheads, perspective), item spacing, flame height/lean, plume rise.</li>
        <li>Flame size and brightness follow the engine's burning length, heat release Q (relative to this run's peak) and current O₂ relative to the initial O₂; lean follows u; it is taller with gravity and squatter in µg. Dashed flame outline = spread model theory-only.</li>
        <li>Detector circle radius = transport distance d (a scenario input); the engine models no sensing radius. It turns solid only when the engine reports smoke at the detector and red only on the alarm event.</li>
      </ul>
      <div className="mt-2 flex flex-wrap gap-1">{theory.map(([k]) => <TheoryBadge key={k} what={k} />)}{partial && <BoundedBadge />}</div>
      {r?.warnings.length ? <><p className="label mt-3">Engine warnings</p><ul className="space-y-0.5 text-[12px] text-warn">{r.warnings.map((w, i) => <li key={i}>⚠ {w}</li>)}</ul></> : null}
      {r && <><p className="label mt-3">Calibration</p>
        <ul className="space-y-0.5 text-[12px]">{Object.entries(r.provenance.params).map(([k, p]) => <li key={k}><span className="font-medium">{k}</span>: {p.calibrated ? "calibrated" : "◌ theory-only"} · <span className="text-mute">{p.source}</span></li>)}</ul>
        <p className="label mt-3">Sources</p>
        <ul className="space-y-0.5 text-[12px]">{r.provenance.sources.map((s, i) => <li key={i} className="border-l-2 border-line pl-2">{fmtProv(s)}</li>)}</ul></>}
      {!r && <p className="mt-3 text-mute">Run the scenario to see calibration, warnings and sources.</p>}
    </div>
  );
}

function Dock() {
  const { a, ra, rb, frame, replay, dockTab, set } = useSim();
  if (!a) return null;
  const tabs: [string, string][] = [...CHARTS.map((c) => [c.lines[0].f, c.title] as [string, string]), ...(replay ? [["replay", "Replay vs telemetry"] as [string, string]] : [])];
  const err = replay && ra && TELEMETRY ? replayError(ra, TELEMETRY) : null;
  return (
    <div className="flex h-[230px] shrink-0 flex-col border-t border-line" data-testid="dock">
      <div className="flex gap-1 overflow-x-auto px-2 pt-1" role="tablist" aria-label="Charts">
        {tabs.map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={dockTab === k} className={`whitespace-nowrap px-2 py-0.5 text-[12px] ${dockTab === k ? "border-b-2 border-ink text-ink" : "text-mute hover:text-ink"}`} onClick={() => set({ dockTab: k })}>{l}</button>)}
      </div>
      <div className="min-h-0 flex-1 px-2" role="tabpanel">
        {dockTab === "replay" ? (
          <section className="h-full overflow-y-auto py-1" data-testid="telemetry-overlay">
            <p className="text-[12px] text-mute">Open circles on the charts are measured values from {TELEMETRY?.source_id ?? "PSI-100"} · {TELEMETRY?.locator ?? "telemetry not ingested"}. The error is shown as computed, good or bad.</p>
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_260px]">
              <div>
                <p className="label">Cabin-scale sanity check</p>
                <p className="text-[12px] text-mute">A sample-size Saffire fire barely changes a vehicle&apos;s cabin; the model reproduces that near-ambient response (T RMSE ~6 K, P MAPE ~0.2%), computed live. This is not a test of flame-spread physics.</p>
                {ra ? <ReplayMetrics err={err} /> : <p className="text-[12px] text-mute">Run to compute the replay error.</p>}
              </div>
              <SpreadCalibration />
            </div>
          </section>
        ) : ra ? <Charts ra={ra} rb={rb} sa={a} frame={frame} replay={replay} only={dockTab as never} height={190} />
          : <p className="py-6 text-center text-[13px] text-mute">Press ▶ Run to simulate {sig(a.t_end_s, 3)} s of this cabin ({MC_N} Monte Carlo runs for the uncertainty bands).</p>}
      </div>
    </div>
  );
}

/* ---------- right: outputs / evidence / assistant ---------- */
function RightPanel() {
  const { a, b, ra, rb, rightTab, set } = useSim();
  if (!a) return null;
  const tabs = [["outputs", "Outputs"], ["evidence", "Evidence"], ["assistant", "AI interpretation"]] as const;
  return (
    <>
      <div className="flex border-b border-line" role="tablist" aria-label="Results">
        {tabs.map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={rightTab === k} data-testid={`tab-${k}`}
          className={`flex-1 px-2 py-2 text-[13px] ${rightTab === k ? "border-b-2 border-ink font-medium text-ink" : "text-mute hover:text-ink"}`} onClick={() => set({ rightTab: k })}>{l}</button>)}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3" role="tabpanel">
        {rightTab === "outputs" && <div className="space-y-2">
          <Mitigation sc={a} r={ra} label={b ? "A" : null} />
          {b && <Mitigation sc={b} r={rb} label="B" />}
          <Outcome sc={a} r={ra} label={b ? "A" : null} />
          {b && rb && <Outcome sc={b} r={rb} label="B" />}
          <Tornado sc={a} />
          {b && rb ? <NextTest sc={b} r={rb} /> : ra && <NextTest sc={a} r={ra} />}
        </div>}
        {rightTab === "evidence" && <Evidence sc={a} />}
        {rightTab === "assistant" && <Interpretation />}
      </div>
    </>
  );
}

/** Mitigation status at the playhead, strictly from engine events and scenario inputs. */
function Mitigation({ sc, r, label }: { sc: Scenario; r: SimResult | null; label: string | null }) {
  const frame = useSim((s) => s.frame);
  const F = runFacts(sc, r);
  const t = r ? r.t[Math.min(frame, r.t.length - 1)] : 0;
  const at = (x: number | null | undefined) => x != null && t >= x;
  const det = sc.detection.threshold == null && sc.detection.manual_alarm_s == null
    ? <span className="text-faint">No data (no sourced detector threshold)</span>
    : !F ? <span className="text-mute">not run</span>
      : at(F.tAlarm) ? <span className="text-bad">▲ Alarm at {sig(F.tAlarm!, 3)} s</span>
        : <span>○ Monitoring{F.tAlarm == null ? " · no alarm in this run" : ""}</span>;
  const fan = sc.cabin.flow_m_s === 0 ? "no forced flow" : !sc.cabin.fan_off_on_alarm ? `running · ${sig(sc.cabin.flow_m_s * 100, 3)} cm/s (no fan-off on alarm)`
    : F && at(F.tFanOff) ? `■ off at ${sig(F.tFanOff!, 3)} s` : `running · ${sig(sc.cabin.flow_m_s * 100, 3)} cm/s · stops on alarm`;
  const sup = sc.suppression.agent === "none" ? "none configured" : sc.suppression.mass_kg <= 0 ? `${sc.suppression.agent} · 0 kg (inactive)`
    : F && at(F.tAgent) ? `▨ ${sc.suppression.agent} ${sig(sc.suppression.mass_kg, 3)} kg released at ${sig(F.tAgent!, 3)} s`
      : `${sc.suppression.agent} ${sig(sc.suppression.mass_kg, 3)} kg armed · alarm + ${sig(sc.suppression.delay_s, 3)} s${F && F.tAlarm == null ? " · not released (no alarm)" : ""}`;
  const f = r ? Math.min(frame, r.t.length - 1) : 0;
  return (
    <section className="space-y-1 border-b border-line pb-2 text-[13px]" data-testid="mitigation">
      <p className="label">Mitigation status{label ? ` · ${label}` : ""} {r && <span className="num normal-case tracking-normal text-faint">@ {sig(r.t[f], 3)} s</span>}</p>
      <div className="grid grid-cols-[92px_minmax(0,1fr)] gap-x-2 gap-y-0.5">
        <span className="text-mute">Detection</span><span>{det}</span>
        <span className="text-mute">Ventilation</span><span>{fan}</span>
        <span className="text-mute">Suppression</span><span>{sup}</span>
        {sc.items.map((it) => {
          const tr = r?.items.find((x) => x.id === it.id);
          const st = tr?.status[f];
          return <div key={it.id} className="contents"><span className="truncate text-mute" title={it.id}>{materialByKey(it.material_key)?.display_name ?? it.id}</span>
            <span>{!st ? "not run" : st === "burning" ? <span>● burning</span> : st === "out" ? `✕ extinct (${tr?.extinguish_reason ?? "—"})` : "○ not ignited"}</span></div>;
        })}
      </div>
    </section>
  );
}

/* ---------- Compare: headline delta, extrapolation badge, next test ---------- */
const DELTA_KEYS = [["time_to_extinguish", "Burnout"], ["peak_T", "Peak temperature"], ["peak_co", "Peak CO"]] as const;

function DeltaCard({ a, b, ra, rb, openInspector }: { a: Scenario; b: Scenario; ra: SimResult; rb: SimResult; openInspector: () => void }) {
  const set = useSim((s) => s.set);
  const metric = (r: SimResult, k: string) => r.outcome.metrics.find((m) => m.key === k) ?? null;
  const pick = DELTA_KEYS.find(([k]) => metric(ra, k)?.value != null && metric(rb, k)?.value != null);
  const oob = [...outOfEnvelope(b), ...outOfEnvelope(a)];
  const seen = new Set<string>();
  const oobText = oob.filter((o) => (seen.has(o.text) ? false : (seen.add(o.text), true))).map((o) => o.text);
  const nt = nextTest(b, rb);
  let headline: React.ReactNode = "No data";
  if (pick) {
    const [k, label] = pick;
    const ma = metric(ra, k)!, mb = metric(rb, k)!;
    const va = ma.value as number, vb = mb.value as number;
    let tail = "";
    if (va > 0 && vb > 0) {
      const timeLike = k === "time_to_extinguish";
      const ratio = timeLike ? Math.max(va, vb) / Math.min(va, vb) : vb / va;
      tail = timeLike ? ` (${sig(ratio, 2)}× ${vb < va ? "faster" : vb > va ? "slower" : "same"})` : ` (${sig(ratio, 2)}× A)`;
    }
    headline = <>{label}: {a.name} <span className="num">{sig(va, 3)} {ma.units}</span> → {b.name} <span className="num">{sig(vb, 3)} {mb.units}</span>{tail}</>;
  }
  const goNext = () => { openInspector(); set({ rightTab: "outputs" }); requestAnimationFrame(() => requestAnimationFrame(() => document.getElementById("next-test")?.scrollIntoView({ block: "start", behavior: "smooth" }))); };
  return (
    <section data-testid="delta-card" className="space-y-2 border-t border-line bg-panel px-3 py-2" aria-label="Compare result">
      <p className="text-[18px] font-semibold">{headline}</p>
      {oobText.length > 0 && <p className="flex flex-wrap items-center gap-2">
        <span data-testid="extrapolated" className="chip border-2 border-warn px-2 py-0.5 text-[16px] font-bold tracking-wide text-warn">EXTRAPOLATED</span>
        <span className="num text-[13px] text-warn">{oobText.join(" · ")}</span>
      </p>}
      <p className="flex flex-wrap items-center gap-2 text-[13px]">
        <button type="button" className="btn px-2 py-0.5 text-[12px]" onClick={goNext}>Next test to fly →</button>
        <span className="text-mute">{nt ? nt.condition : "Inside the tested envelope, no new test needed for this scenario"}</span>
      </p>
    </section>
  );
}

/** The real model check beside the replay: spread calibration on the held-out SIBAL flight test (from data/params/spread.json). */
function SpreadCalibration() {
  const test = (spreadCal.metrics?.test ?? []) as { sample: string; rel_err: number }[];
  return (
    <aside className="border-l border-line pl-3 text-[12px]" data-testid="spread-calibration">
      <p className="label">Model check: flame spread</p>
      <p>Spread calibration on held-out SIBAL: <span className="num">{sig(spreadCal.metrics.test_mape_pct, 3)}%</span> error, n = <span className="num">{test.length}</span></p>
      {test.map((t) => <p key={t.sample} className="num text-faint">{t.sample}: rel. err {sig(t.rel_err * 100, 3)}%</p>)}
    </aside>
  );
}

function StatusBar() {
  const { ra } = useSim();
  return (
    <div className="flex flex-wrap items-center gap-3 border-t border-line bg-panel px-3 py-0.5 text-[11px] text-faint lg:h-6 lg:flex-nowrap" data-noprint>
      <a className="underline underline-offset-2" href="https://psi.nasa.gov/physci/repo/search?q=combustion" target="_blank" rel="noreferrer" data-testid="psi-resource-link">NASA PSI Data Repository: Combustion Science</a>
      <span>Partial gravity is a bounded estimate (µg ↔ 1 g). Not for flight certification.</span>
      {ra && <span className="num ml-auto">EmberAtlas {ra.provenance.engine_version} · seed {ra.provenance.seed} · {MC_N} MC runs · SI internal</span>}
    </div>
  );
}

