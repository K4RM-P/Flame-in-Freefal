"use client";
// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Simulation Hub: full-height engineering workspace (desktop-first, no page scroll while simulating).
// Toolbar · left project tree + scenario setup + saved states · center cabin viewport + (Compare) delta card + chart dock · right outputs/evidence/interpretation.
// Reuses the existing engine (runAll), receipts (Num), outcome/evidence/sensitivity/next-test panels and manual setup.
import { useCallback, useEffect, useRef, useState } from "react";
import { PRESETS } from "@/lib/sim/presets";
import { replayError } from "@/lib/sim/replay";
import { exportPsiRowsCsv, exportScenarioJson, exportSeriesCsv } from "@/lib/sim/export";
import { ScenarioSchema, type Scenario, type SimResult } from "@/lib/sim/types";
import { lsGet, lsSet } from "@/lib/store";
import { sig, withUnit } from "@/lib/ui/format";
import { CHARTS, Charts } from "./Charts";
import { CabinView, Legend, runFacts, useReducedMotion } from "./CabinView";
import { ScenarioPanel, applyPreset, fmtProv } from "./ScenarioPanel";
import { TELEMETRY, materialByKey } from "./data";
import { BoundedBadge, Evidence, Interpretation, MC_N, NextTest, Outcome, ReplayMetrics, TheoryBadge, Tornado, download, missingFields, playPause, runAll } from "./bits";
import { nextTest, outOfEnvelope } from "@/lib/sim/nextTest";
import { DesignReview } from "./DesignReview";
import spreadCal from "@/data/params/spread.json";
import { LAYERS, PLAYBACK, loadUi, saveUi, useSim } from "./store";
import { Scene3D } from "./scene3d/Scene3D";
import { PRESET_LABELS } from "./scene3d/CameraRig";

export function Workspace() {
  usePlayback();
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const { treeOpen, present, set } = useSim();
  useEffect(() => {
    const ui = loadUi();
    const q = new URLSearchParams(window.location.search);
    set({ dockOpen: ui.dockOpen, dockVh: ui.dockVh, treeOpen: ui.treeOpen ?? window.innerWidth >= 1440, present: q.get("present") === "1" });
  }, [set]);
  usePresentAutoRun();
  if (present) return <PresentMode />;
  const toggleTree = () => { set({ treeOpen: !treeOpen }); saveUi({ treeOpen: !treeOpen }); };
  return (
    <div className="flex flex-col gap-2 lg:fixed lg:inset-x-0 lg:bottom-0 lg:top-14 lg:z-30 lg:gap-0 lg:bg-bg print:static" data-testid="workspace">
      <Toolbar inspectorOpen={inspectorOpen} onToggleInspector={() => setInspectorOpen((v) => !v)} />
      <NextStep inspectorOpen={inspectorOpen} openInspector={() => setInspectorOpen(true)} />
      <div className="relative flex min-h-0 flex-1 flex-col gap-2 lg:flex-row lg:gap-0">
        <nav className="hidden w-11 shrink-0 flex-col items-center gap-1 border-r border-line bg-panel py-2 lg:flex" aria-label="Panels" data-noprint data-testid="rail">
          <button type="button" className="btn h-8 w-8 justify-center px-0" aria-expanded={treeOpen} aria-label={treeOpen ? "Collapse project tree" : "Expand project tree"} title="Project tree" onClick={toggleTree}>{treeOpen ? "⟨" : "☰"}</button>
          <button type="button" className="btn h-8 w-8 justify-center px-0" title="Scenario setup" aria-label="Scenario setup" onClick={() => { set({ treeOpen: true }); saveUi({ treeOpen: true }); requestAnimationFrame(() => { const d = document.getElementById("setup-details") as HTMLDetailsElement | null; if (d) d.open = true; }); }}>⚙</button>
          <button type="button" className="btn h-8 w-8 justify-center px-0" title="Saved states" aria-label="Saved states" onClick={() => { set({ treeOpen: true }); saveUi({ treeOpen: true }); requestAnimationFrame(() => go("sec-saved")); }}>⧉</button>
        </nav>
        <aside className={`min-h-0 overflow-y-auto border-line bg-bg px-3 pb-3 lg:w-72 lg:shrink-0 lg:border-r ${treeOpen ? "" : "lg:hidden"} lg:max-[1439px]:absolute lg:max-[1439px]:inset-y-0 lg:max-[1439px]:left-11 lg:max-[1439px]:z-40 lg:max-[1439px]:shadow-2xl`} data-noprint aria-label="Project and scenario setup">
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
        <aside className={`flex min-h-0 min-w-0 flex-col border-line bg-bg lg:w-96 lg:shrink-0 lg:border-l lg:max-[1439px]:absolute lg:max-[1439px]:inset-y-0 lg:max-[1439px]:right-0 lg:max-[1439px]:z-40 lg:max-[1439px]:shadow-2xl ${inspectorOpen ? "" : "hidden"}`} aria-label="Outputs, evidence and interpretation"><RightPanel /></aside>
      </div>
      <StatusBar />
    </div>
  );
}

/** ?present=1: chrome hidden, the run auto-plays (≈22 s), the camera dollies Overview → close-up. */
function PresentMode() {
  const { a, b, ra, rb, frame } = useSim();
  const [letterbox, setLetterbox] = useState(false);
  if (!a) return null;
  const views = [{ sc: a, r: ra, label: b ? `A · ${a.name}` : a.name }, ...(b ? [{ sc: b, r: rb, label: `B · ${b.name}` }] : [])];
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black" data-testid="present">
      <div className={letterbox ? "relative aspect-video w-full max-h-full max-w-[calc(100vh*16/9)]" : "relative h-full w-full"}>
        <Scene3D views={views} frame={frame} />
      </div>
      <button type="button" className="glass absolute bottom-2 right-2 px-2 py-0.5 text-[11px] opacity-40 hover:opacity-100" aria-pressed={letterbox} onClick={() => setLetterbox((v) => !v)} data-testid="letterbox">Recording-safe 16:9</button>
    </div>
  );
}

function usePresentAutoRun() {
  const { present, a, ra, running } = useSim();
  const done = useRef(false);
  useEffect(() => {
    if (!present || done.current || running) return;
    if (!a) { const p = PRESETS.find((x) => x.id === "lunar-tune") ?? PRESETS[0]; applyPreset(p); return; }
    if (ra) { done.current = true; useSim.getState().set({ frame: 0, playing: true }); return; }
    if (missingFields(a).length) return;
    done.current = true;
    void runAll().then(() => useSim.getState().set({ frame: 0, playing: true }));
  }, [present, a, ra, running]);
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
    text = <>Enter the <b>{missing.join(", ")}</b>: there is no sourced value. Then press ▶ Play.</>;
    action = <button type="button" className="btn px-2 py-0.5 text-[12px]" onClick={() => revealMissing(missing[0])}>Enter it</button>;
  } else return null;
  if (running) text = <>Simulating {MC_N} Monte Carlo runs…</>;
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
/** Video-like playback: sim time advances with wall time (whole run ≈ BASE_S at 1×, scaled by speed). The 3D view
 *  reads the fractional playhead every frame; the store frame updates at ≤ 20 Hz to keep the page light. */
const BASE_S = 24;
function usePlayback() {
  const { playing, ra, set, present, speed } = useSim();
  useEffect(() => {
    if (!playing || !ra) return;
    const N = ra.t.length, tEnd = ra.t[N - 1], t0 = ra.t[0];
    const rate = ((tEnd - t0) / (present ? 22 : BASE_S)) * (present ? 1 : speed);
    let tSim = ra.t[Math.min(useSim.getState().frame, N - 1)], last = performance.now(), lastSet = 0, raf = 0, lo = 0;
    const tick = (now: number) => {
      tSim += ((now - last) / 1000) * rate; last = now;
      if (tSim >= tEnd) { PLAYBACK.fi = N - 1; set({ frame: N - 1, playing: false }); return; }
      if (ra.t[lo] > tSim) lo = 0;
      while (lo < N - 2 && ra.t[lo + 1] <= tSim) lo++;
      const fi = lo + Math.min(1, (tSim - ra.t[lo]) / Math.max(1e-9, ra.t[lo + 1] - ra.t[lo]));
      PLAYBACK.fi = fi;
      if (now - lastSet > 50 && Math.floor(fi) !== useSim.getState().frame) { lastSet = now; set({ frame: Math.floor(fi) }); }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, ra, set, present, speed]);
}

/* ---------- toolbar ---------- */
function Toolbar({ inspectorOpen, onToggleInspector }: { inspectorOpen: boolean; onToggleInspector: () => void }) {
  const { a, b, ra, rb, editing, running, playing, frame, view, set } = useSim();
  // ea.project = { name, description } (a legacy plain string is still read).
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
      <PlayButton className="btn-accent px-4 py-1" testid="run" />
      {missing.length > 0 && <button type="button" id="run-missing" className="shrink-0 whitespace-nowrap text-[12px] text-warn underline decoration-dotted underline-offset-4"
        title="No sourced value exists for these inputs; enter them to enable Run" onClick={() => revealMissing(missing[0])}>Needs: {missing.join(", ")} →</button>}
      <span className="flex-1" />
      <span className="h-5 w-px bg-line" aria-hidden />
      <div className="flex overflow-hidden border border-line" style={{ borderRadius: 6 }} role="group" aria-label="View" data-testid="view-switch">
        {(["3d", "elevation", "section"] as const).map((v, i) => <button key={v} type="button" aria-pressed={view === v} className={`px-2.5 py-1 text-[12px] ${i ? "border-l border-line" : ""} ${view === v ? "bg-surface2 font-medium text-ink" : "text-mute hover:text-ink"}`} onClick={() => set({ view: v })}>{v === "3d" ? "3D" : v === "elevation" ? "Elevation" : "Section"}</button>)}
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

/* ---------- center: viewport (3D or SVG), viewport chrome, assumptions drawer, delta card, chart dock ---------- */
const typing = (e: KeyboardEvent) => { const t = e.target as HTMLElement | null; if (!t) return false; if (t.tagName === "INPUT") return !/^(range|checkbox|radio|button|submit)$/.test((t as HTMLInputElement).type); return t.isContentEditable || /^(TEXTAREA|SELECT)$/.test(t.tagName); };

function Center({ openInspector }: { openInspector: () => void }) {
  const { a, b, ra, rb, frame, runError, assumptionsOpen, view, set } = useSim();
  const vp = useRef<HTMLDivElement>(null);
  const fullscreen = useCallback(() => {
    const el = vp.current; if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen?.(); else void el.requestFullscreen?.().catch(() => undefined);
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (typing(e) || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === "f") { e.preventDefault(); fullscreen(); }
      else if (k === "c") { const open = !useSim.getState().dockOpen; set({ dockOpen: open }); saveUi({ dockOpen: open }); }
      else if (k === "r") { void playPause(); }
      else if (k === " " && !(e.target instanceof HTMLButtonElement)) { e.preventDefault(); void playPause(); }
      else if (["1", "2", "3", "4"].includes(k)) set({ camPreset: { id: Number(k), nonce: Date.now() }, view: "3d" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen, set]);
  if (!a) return null;
  const missing = [...missingFields(a), ...(b ? missingFields(b).map((m) => `B: ${m}`) : [])];
  const views = [{ sc: a, r: ra, label: b ? `A · ${a.name}` : a.name }, ...(b ? [{ sc: b, r: rb, label: `B · ${b.name}` }] : [])];
  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col" aria-label="Simulation viewport">
      <div ref={vp} className="viewport3d relative min-h-[60vh] flex-1 bg-bg lg:min-h-0" data-testid="viewport">
        {view === "3d" ? <Scene3D views={views} frame={frame} />
          : <div className={`grid h-full ${b ? "grid-cols-2 divide-x divide-line" : ""}`}>
              <CabinView sc={a} r={ra} frame={frame} label={b ? `A · ${a.name}` : a.name} compact={!!b} />
              {b && <CabinView sc={b} r={rb} frame={frame} label={`B · ${b.name}`} compact />}
            </div>}
        {missing.length > 0 && view !== "3d" && <p id="run-missing-note" className="absolute inset-x-2 top-2 z-10 border border-warn/50 bg-panel px-2 py-1 text-[13px] text-warn" style={{ borderRadius: 6 }}>Enter {missing.join(", ")} to run: there is no sourced value.</p>}
        {runError && <p className="absolute inset-x-2 top-10 z-10 bg-panel px-2 text-[13px] text-bad" role="alert">Run failed: {runError}</p>}
        <Transport fullscreen={fullscreen} />
        {assumptionsOpen && <Assumptions sc={a} r={ra} />}
      </div>
      {b && ra && rb && <DeltaCard a={a} b={b} ra={ra} rb={rb} openInspector={openInspector} />}
      <Dock />
    </section>
  );
}

/** The single Play action, shared by the toolbar and the viewport transport (same behaviour everywhere). */
function PlayButton({ className, testid, compact = false }: { className: string; testid?: string; compact?: boolean }) {
  const { a, b, running, playing } = useSim();
  const missing = a ? [...missingFields(a), ...(b ? missingFields(b) : [])] : [];
  return <button type="button" className={className} data-testid={testid} disabled={running || missing.length > 0} aria-label={playing ? "Pause" : "Play"}
    title={missing.length ? `Enter ${missing.join(", ")} first` : "Play (Space): runs the simulation if needed, then plays it"} onClick={() => void playPause()}>
    {running ? (compact ? "…" : "Simulating…") : playing ? (compact ? "❚❚" : "❚❚ Pause") : (compact ? "▶" : "▶ Play")}</button>;
}

const EV: Record<string, [string, string]> = { ignition: ["●", "text-accent"], alarm: ["▲", "text-bad"], fan_off: ["■", "text-mute"], agent_released: ["▨", "text-blue"], extinguished: ["✕", "text-ink"] };
const SPEEDS = [0.5, 1, 2, 4];

/** Video-player strip at the bottom of the viewport: play/pause, time, scrubber with engine-event markers, speed,
 *  then camera, layers, legend, assumptions and fullscreen. */
function Transport({ fullscreen }: { fullscreen: () => void }) {
  const { ra, frame, view, layers, assumptionsOpen, speed, set } = useSim();
  const last = ra ? ra.t.length - 1 : 0, f = Math.min(frame, last);
  const t0 = ra?.t[0] ?? 0, tEnd = ra?.t[last] ?? 1;
  const evs = ra ? ra.events.filter((e) => EV[e.kind]).filter((e, i, arr) => arr.findIndex((x) => x.kind === e.kind) === i) : [];
  const btn = "px-2 py-1 text-[12px] text-mute hover:text-ink";
  return (
    <div className="glass absolute inset-x-2 bottom-2 z-20 flex items-center gap-2 px-1.5 py-1" data-noprint data-testid="transport">
      <PlayButton className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent text-[13px] font-semibold text-black disabled:opacity-50" compact testid="play" />
      <span className="num w-[104px] shrink-0 text-[12px]">{ra ? `${sig(ra.t[f], 3)} / ${sig(tEnd, 3)} s` : "— / — s"}</span>
      <div className="relative min-w-[120px] flex-1">
        {evs.map((e) => <span key={e.kind} className={`pointer-events-none absolute -top-2.5 -translate-x-1/2 text-[10px] leading-none ${EV[e.kind][1]}`} style={{ left: `${((e.t_s - t0) / Math.max(1e-9, tEnd - t0)) * 100}%` }} title={`${e.kind.replace("_", " ")} · ${sig(e.t_s, 3)} s`}>{EV[e.kind][0]}</span>)}
        <input type="range" className="w-full accent-[rgb(var(--accent))]" min={0} max={last} value={f} disabled={!ra} aria-label="Simulation time"
          onChange={(e) => set({ playing: false, frame: Number(e.target.value) })} />
      </div>
      <select aria-label="Playback speed" className="w-14 shrink-0 border-0 bg-transparent px-1 py-0 text-[12px]" value={speed} onChange={(e) => set({ speed: Number(e.target.value) })}>
        {SPEEDS.map((s) => <option key={s} value={s}>{s}×</option>)}
      </select>
      <span className="h-5 w-px shrink-0 bg-line" aria-hidden />
      {view === "3d" && <details className="relative shrink-0">
        <summary className={`${btn} cursor-pointer list-none`} title="Camera (1–4)">Camera ▾</summary>
        <div className="glass absolute bottom-10 right-0 grid min-w-44 gap-0.5 p-1 text-[12px]">
          {PRESET_LABELS.map((l, i) => <button key={l} type="button" className="px-2 py-1 text-left hover:bg-surface2" onClick={() => set({ camPreset: { id: i + 1, nonce: Date.now() } })}><span className="num text-faint">{i + 1}</span> {l}</button>)}
        </div>
      </details>}
      <details className="relative shrink-0">
        <summary className={`${btn} cursor-pointer list-none`}>Layers ▾</summary>
        <div className="glass absolute bottom-10 right-0 grid min-w-48 gap-1 p-2 text-[12px]" data-testid="layers-menu">
          {LAYERS.map((l) => <label key={l.k} className="flex items-center gap-1.5 px-1"><input type="checkbox" checked={layers[l.k]} onChange={(e) => set({ layers: { ...layers, [l.k]: e.target.checked } })} />{l.label}</label>)}
        </div>
      </details>
      <details className="relative shrink-0">
        <summary className={`${btn} cursor-pointer list-none`} aria-label="Legend and assumptions" title="Legend and assumptions">?</summary>
        <div className="glass absolute bottom-10 right-0 w-72 space-y-2 p-2"><Legend />
          <button type="button" className="text-[12px] underline underline-offset-2" aria-expanded={assumptionsOpen} onClick={() => set({ assumptionsOpen: !assumptionsOpen })}>Assumptions &amp; evidence →</button></div>
      </details>
      <button type="button" className={btn} onClick={fullscreen} title="Fullscreen (F)" aria-label="Fullscreen" data-testid="fullscreen">⛶</button>
    </div>
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
  const { a, ra, rb, frame, replay, dockTab, dockOpen, dockVh, set } = useSim();
  const [vh, setVh] = useState(900);
  useEffect(() => { const f = () => setVh(window.innerHeight); f(); window.addEventListener("resize", f); return () => window.removeEventListener("resize", f); }, []);
  if (!a) return null;
  const tabs: [string, string][] = [...CHARTS.map((c) => [c.lines[0].f, c.title] as [string, string]), ...(replay ? [["replay", "Replay: cabin-scale sanity check"] as [string, string]] : [])];
  const err = replay && ra && TELEMETRY ? replayError(ra, TELEMETRY) : null;
  const toggle = (open = !dockOpen) => { set({ dockOpen: open }); saveUi({ dockOpen: open }); };
  const hPx = Math.round((dockVh / 100) * vh), chartH = Math.max(120, hPx - 48);
  const drag = (e: React.PointerEvent) => {
    e.preventDefault(); const y0 = e.clientY, h0 = dockVh;
    const move = (ev: PointerEvent) => { const v = Math.max(15, Math.min(70, h0 + ((y0 - ev.clientY) / window.innerHeight) * 100)); set({ dockVh: v }); };
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); saveUi({ dockVh: useSim.getState().dockVh }); };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
  };
  const tabBar = <div className="flex min-w-0 items-center gap-1 overflow-x-auto px-2" role="tablist" aria-label="Charts">
    {tabs.map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={dockTab === k} className={`whitespace-nowrap px-2 py-0.5 text-[12px] ${dockTab === k ? "border-b-2 border-ink text-ink" : "text-mute hover:text-ink"}`} onClick={() => { set({ dockTab: k }); if (!dockOpen) toggle(true); }}>{l}</button>)}
  </div>;
  if (!dockOpen) return (
    <div className="flex h-9 shrink-0 items-center gap-2 border-t border-line bg-panel" data-testid="dock" data-open="false">
      <button type="button" className="px-2 text-[12px] text-mute hover:text-ink" aria-expanded={false} aria-label="Expand chart dock (C)" title="Expand charts (C)" onClick={() => toggle(true)}>▴ Charts</button>
      {tabBar}
      <Sparkline r={ra} field={dockTab} frame={frame} />
    </div>
  );
  return (
    <div className="relative flex shrink-0 flex-col border-t border-line" style={{ height: hPx }} data-testid="dock" data-open="true">
      <div className="absolute inset-x-0 -top-1 z-10 h-2 cursor-row-resize" onPointerDown={drag} role="separator" aria-orientation="horizontal" aria-label="Resize chart dock" />
      <div className="flex items-center pt-1">
        <button type="button" className="px-2 text-[12px] text-mute hover:text-ink" aria-expanded={true} aria-label="Collapse chart dock (C)" title="Collapse charts (C)" onClick={() => toggle(false)}>▾</button>
        {tabBar}
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
        ) : ra ? <Charts ra={ra} rb={rb} sa={a} frame={frame} replay={replay} only={dockTab as never} height={chartH} />
          : <p className="py-6 text-center text-[13px] text-mute">Press ▶ Play to simulate {sig(a.t_end_s, 3)} s of this cabin ({MC_N} Monte Carlo runs for the uncertainty bands).</p>}
      </div>
    </div>
  );
}

/** Live sparkline of the active chart's engine series with the playhead (collapsed dock). */
function Sparkline({ r, field, frame }: { r: SimResult | null; field: string; frame: number }) {
  if (!r || !(field in (r.state[0] ?? {}))) return <span className="ml-auto pr-3 text-[11px] text-faint">{r ? "" : "run to see the live trace"}</span>;
  const ys = r.state.map((s) => (s as unknown as Record<string, number>)[field]);
  const lo = Math.min(...ys), hi = Math.max(...ys), W = 220, H = 22;
  const step = Math.max(1, Math.floor(ys.length / 120));
  const pts = ys.filter((_, i) => i % step === 0).map((y, i, arr) => `${((i / Math.max(1, arr.length - 1)) * W).toFixed(1)},${(H - 2 - ((y - lo) / (hi - lo || 1)) * (H - 4)).toFixed(1)}`).join(" ");
  const f = Math.min(frame, ys.length - 1), px = (f / Math.max(1, ys.length - 1)) * W;
  return (
    <svg width={W} height={H} className="ml-auto mr-3 shrink-0" aria-label={`${field} trace`} data-testid="sparkline">
      <polyline points={pts} fill="none" stroke="rgb(var(--mute))" strokeWidth={1.2} />
      <line x1={px} x2={px} y1={0} y2={H} stroke="rgb(var(--ink))" strokeWidth={1} />
    </svg>
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
          {b && rb ? <DesignReview sc={b} r={rb} label="B" /> : <DesignReview sc={a} r={ra} />}
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
    headline = <>{label}: {a.name} <span className="num">{withUnit(va, ma.units)}</span> → {b.name} <span className="num">{withUnit(vb, mb.units)}</span>{tail}</>;
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
        <span className="text-mute">{nt ? <><b className="text-ink">{nt.condition}.</b> {nt.reason}</> : "Inside the tested envelope, no new test needed for this scenario"}</span>
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
      {ra && <span className="num ml-auto">EmberAtlas {ra.provenance.engine_version} · seed {ra.provenance.seed} · {MC_N} MC runs · spread test error {spreadCal.metrics.test_mape_pct} % (n = {spreadCal.metrics.test.length})</span>}
    </div>
  );
}

