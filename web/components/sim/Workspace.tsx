"use client";
// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Simulator, mission-control layout. Rule: a first-time judge understands the screen in 5 seconds.
// Top bar = preset · Run · Play/Pause · timeline (engine-event ticks) · ⋯ More. Left = slim rail → 5 scenario rows
// (popover editors) + collapsed Advanced. Centre = 3D viewport (≥ 75 %) with 4 HUD chips, one-line result strip and a
// thin chart strip. Right = AI drawer (closed by default). Everything else lives in ⋯ More.
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bell, Box, Camera, Check, ChevronDown, ChevronRight, Download, Eye, FileJson, Flame, FlaskConical, Gauge, HelpCircle,
  Image as ImageIcon, Info, Layers, ListChecks, Maximize, MoreHorizontal, PanelLeftClose, PanelLeftOpen, Pause, Play,
  Printer, RotateCcw, Save, ShieldCheck, Sparkles, Wind, X,
} from "lucide-react";
import { PRESETS } from "@/lib/sim/presets";
import { replayError } from "@/lib/sim/replay";
import { exportPsiRowsCsv, exportScenarioJson, exportSeriesCsv } from "@/lib/sim/export";
import { ScenarioSchema, type Scenario, type SimResult } from "@/lib/sim/types";
import { nextTest, outOfEnvelope } from "@/lib/sim/nextTest";
import { lsGet, lsSet } from "@/lib/store";
import { sig, withUnit } from "@/lib/ui/format";
import { cn } from "@/lib/utils";
import spreadCal from "@/data/params/spread.json";
import { Button } from "@/components/ui/button";
import { Tip } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioGroup,
  DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/sonner";
import { CHARTS, Charts } from "./Charts";
import { CabinView, Legend, runFacts } from "./CabinView";
import { ScenarioPanel, applyPreset, fmtProv, type ScenarioPart } from "./ScenarioPanel";
import { TELEMETRY, materialByKey } from "./data";
import { DesignReview } from "./DesignReview";
import { BoundedBadge, Evidence, Interpretation, MC_N, NextTest, Outcome, ReplayMetrics, TheoryBadge, Tornado, compact, download, evidenceForAI, missingFields, playPause, runAll } from "./bits";
import { LAYERS, PLAYBACK, loadUi, saveUi, useSim, type ChatMsg } from "./store";
import { HudExtras, Scene3D } from "./scene3d/Scene3D";
import { PRESET_LABELS } from "./scene3d/CameraRig";

const ICON = { size: 16, strokeWidth: 1.5 } as const;

export function Workspace() {
  usePlayback();
  const { present, set } = useSim();
  useEffect(() => {
    const ui = loadUi();
    const q = new URLSearchParams(window.location.search);
    // Left panel starts collapsed to a slim rail (first-time clarity); the dock stays a thin strip.
    set({ dockOpen: ui.dockOpen, dockVh: ui.dockVh, treeOpen: ui.treeOpen ?? false, present: q.get("present") === "1" });
  }, [set]);
  usePresentAutoRun();
  useShortcuts();
  if (present) return <PresentMode />;
  return (
    <div className="flex flex-col lg:fixed lg:inset-x-0 lg:bottom-0 lg:top-14 lg:z-30 lg:bg-bg print:static" data-testid="workspace">
      <Toolbar />
      <div className="relative flex min-h-0 flex-1 flex-col lg:flex-row">
        <LeftPanel />
        <Center />
        <AiDrawer />
      </div>
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

/** Open the left panel and the Cabin row so a disabled Run explains itself. */
function revealMissing(label: string) {
  useSim.getState().set({ editing: label.startsWith("B: ") ? "b" : "a", treeOpen: true, row: "cabin" });
  saveUi({ treeOpen: true });
  requestAnimationFrame(() => requestAnimationFrame(() => (document.querySelector<HTMLInputElement>('[data-testid="volume"]'))?.focus()));
}

/* ---------- playback: advances the playhead through engine frames (data-driven, not decorative) ---------- */
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

/* ---------- keyboard: R run, Space play/pause, F fullscreen, C charts, 1–4 camera (hints live in tooltips) ---------- */
const typing = (e: KeyboardEvent) => { const t = e.target as HTMLElement | null; if (!t) return false; if (t.tagName === "INPUT") return !/^(range|checkbox|radio|button|submit)$/.test((t as HTMLInputElement).type); return t.isContentEditable || /^(TEXTAREA|SELECT)$/.test(t.tagName); };
export function toggleFullscreen() {
  const el = document.querySelector<HTMLElement>('[data-testid="viewport"]'); if (!el) return;
  if (document.fullscreenElement) void document.exitFullscreen?.(); else void el.requestFullscreen?.().catch(() => undefined);
}
/** Run: simulate (or re-simulate) then play from the start. */
async function run() {
  const s = useSim.getState();
  if (s.running || !s.a) return;
  await runAll();
  if (useSim.getState().ra) useSim.getState().set({ frame: 0, playing: true });
}
function useShortcuts() {
  const set = useSim((s) => s.set);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (typing(e) || e.metaKey || e.ctrlKey || e.altKey || useSim.getState().present) return;
      const k = e.key.toLowerCase();
      if (k === "f") { e.preventDefault(); toggleFullscreen(); }
      else if (k === "c") { const open = !useSim.getState().dockOpen; set({ dockOpen: open }); saveUi({ dockOpen: open }); }
      else if (k === "r") { void run(); }
      else if (k === " " && !(e.target instanceof HTMLButtonElement)) { e.preventDefault(); void playPause(); }
      else if (["1", "2", "3", "4"].includes(k)) set({ camPreset: { id: Number(k), nonce: Date.now() }, view: "3d" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [set]);
}

/* ---------- top bar: ≤ 5 visible controls ---------- */
const EV: Record<string, { label: string; cls: string }> = {
  ignition: { label: "Ignition", cls: "bg-ember" }, alarm: { label: "Alarm", cls: "bg-bad" },
  agent_released: { label: "Agent released", cls: "bg-blue" }, extinguished: { label: "Extinguished", cls: "bg-ink" },
};

function Toolbar() {
  const { a, b, ra, running, playing, frame, presetId, set } = useSim();
  if (!a) return null;
  const missing = [...missingFields(a), ...(b ? missingFields(b).map((m) => `B: ${m}`) : [])];
  const last = ra ? ra.t.length - 1 : 0, f = Math.min(frame, last);
  const t0 = ra?.t[0] ?? 0, tEnd = ra?.t[last] ?? 1;
  const evs = ra ? ra.events.filter((e) => EV[e.kind]).filter((e, i, arr) => arr.findIndex((x) => x.kind === e.kind) === i) : [];
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-line bg-bg px-3 py-2 lg:h-12 lg:flex-nowrap lg:py-0" role="toolbar" aria-label="Simulation" data-noprint data-testid="toolbar">
      <select aria-label="Preset" className="h-8 max-w-[230px] text-[13px]" value={presetId ?? "custom"} onChange={(e) => { const p = PRESETS.find((x) => x.id === e.target.value); if (p) applyPreset(p); }}>
        {!presetId && <option value="custom">{a.name}</option>}
        {PRESETS.map((p) => <option key={p.id} value={p.id}>{p.id === "iss-vs-lunar" ? "ISS vs Moon base" : p.label}</option>)}
      </select>
      <Tip label={missing.length ? `Enter ${missing.join(", ")} first` : "Run the simulation"} kbd="R">
        <span><Button size="sm" className="h-8 min-w-[84px]" data-testid="run" disabled={running || missing.length > 0} onClick={() => void run()}>
          {running ? "Running…" : "Run"}</Button></span>
      </Tip>
      <Tip label={playing ? "Pause" : "Play"} kbd="Space">
        <Button variant="secondary" size="icon-sm" data-testid="play" aria-label={playing ? "Pause" : "Play"} disabled={running || missing.length > 0} onClick={() => void playPause()}>
          {playing ? <Pause {...ICON} /> : <Play {...ICON} />}</Button>
      </Tip>
      {missing.length > 0 && <button type="button" id="run-missing" className="shrink-0 whitespace-nowrap font-mono text-[11px] uppercase tracking-[0.06em] text-warn underline decoration-dotted underline-offset-4"
        onClick={() => revealMissing(missing[0])}>Needs: {missing.join(", ")}</button>}
      <div className="flex min-w-[180px] flex-1 items-center gap-3" data-testid="transport">
        <span className="num w-[108px] shrink-0 text-right text-[12px] text-mute" data-testid="time">{ra ? `${sig(ra.t[f], 3)} / ${sig(tEnd, 3)} s` : "— / — s"}</span>
        <div className="relative flex-1">
          {evs.map((e) => (
            <span key={e.kind} aria-hidden title={`${EV[e.kind].label} · ${sig(e.t_s, 3)} s`} className={cn("pointer-events-none absolute -top-2 h-1.5 w-1.5 -translate-x-1/2 rounded-full", EV[e.kind].cls)} style={{ left: `${((e.t_s - t0) / Math.max(1e-9, tEnd - t0)) * 100}%` }} />
          ))}
          <input type="range" className="w-full" min={0} max={last} value={f} disabled={!ra} aria-label="Simulation time"
            aria-valuetext={ra ? `${sig(ra.t[f], 3)} s${evs.length ? `; ${evs.map((e) => `${EV[e.kind].label} ${sig(e.t_s, 3)} s`).join(", ")}` : ""}` : undefined}
            onChange={(e) => set({ playing: false, frame: Number(e.target.value) })} />
        </div>
      </div>
      <MoreMenu />
    </div>
  );
}

interface Saved { id: string; name: string; saved_at: string; a: Scenario; b: Scenario | null }

function MoreMenu() {
  const { a, b, ra, rb, view, layers, speed, assumptionsOpen, presetId, set } = useSim();
  const [saved, setSaved] = useState<Saved[]>([]);
  useEffect(() => { setSaved(lsGet<Saved[]>("ea.saved", [])); }, []);
  if (!a) return null;
  const slug = a.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "scenario";
  const exp = (name: string, text: string, type: string) => { download(name, text, type); toast.success("Exported", { description: name }); };
  const png = () => {
    const c = document.querySelector<HTMLCanvasElement>('[data-testid="viewport"] canvas');
    if (!c) { toast.error("No 3D view to export", { description: "Switch the view to 3D first." }); return; }
    try { const link = document.createElement("a"); link.download = `${slug}_view.png`; link.href = c.toDataURL("image/png"); link.click(); toast.success("Exported", { description: `${slug}_view.png` }); }
    catch (e) { toast.error("PNG export failed", { description: String(e) }); }
  };
  const store = (l: Saved[]) => { setSaved(l); lsSet("ea.saved", l); };
  return (
    <DropdownMenu>
      <Tip label="View, compare, export, saved states, layers">
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" size="sm" className="h-8 gap-1 px-2.5" data-testid="more"><MoreHorizontal {...ICON} /> More</Button>
        </DropdownMenuTrigger>
      </Tip>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuItem onSelect={() => { const p = PRESETS.find((x) => x.id === presetId); if (p) applyPreset(p); else set({ ra: null, rb: null, frame: 0, playing: false }); }}><RotateCcw {...ICON} />Reset</DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger data-testid="view-switch"><Eye {...ICON} />View · {view === "3d" ? "3D" : view === "elevation" ? "Elevation" : "Section"}</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup value={view} onValueChange={(v) => set({ view: v as typeof view })}>
              <DropdownMenuRadioItem value="3d">3D</DropdownMenuRadioItem><DropdownMenuRadioItem value="elevation">Elevation</DropdownMenuRadioItem><DropdownMenuRadioItem value="section">Section</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuCheckboxItem checked={!!b} data-testid="compare" onCheckedChange={() => {
          if (b) set({ b: null, rb: null, editing: "a" });
          else set({ b: { ...structuredClone(a), name: `${a.name} (B)` }, rb: null, editing: "b" });
        }}>Compare A / B</DropdownMenuCheckboxItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger><Gauge {...ICON} />Playback speed · {speed}×</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup value={String(speed)} onValueChange={(v) => set({ speed: Number(v) })}>
              {[0.5, 1, 2, 4].map((s) => <DropdownMenuRadioItem key={s} value={String(s)}>{s}×</DropdownMenuRadioItem>)}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger><Download {...ICON} />Export</DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-56">
            <DropdownMenuItem onSelect={() => exp(`${slug}_scenario.json`, exportScenarioJson(a), "application/json")}><FileJson {...ICON} />Scenario (JSON)</DropdownMenuItem>
            <DropdownMenuItem disabled={!ra} onSelect={() => ra && exp(`${slug}_series.csv`, exportSeriesCsv(ra), "text/csv")}><Download {...ICON} />Simulation series (CSV)</DropdownMenuItem>
            <DropdownMenuItem disabled={!ra} onSelect={() => ra && exp(`${slug}_psi_rows.csv`, exportPsiRowsCsv(a, ra), "text/csv")}><Download {...ICON} />PSI test rows (CSV)</DropdownMenuItem>
            <DropdownMenuItem onSelect={png}><ImageIcon {...ICON} />3D view (PNG)</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => window.print()}><Printer {...ICON} />Print report</DropdownMenuItem>
            {rb && <DropdownMenuLabel className="normal-case tracking-normal">Exports cover scenario A.</DropdownMenuLabel>}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger><Save {...ICON} />Saved states</DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-64" data-testid="saved-states">
            <DropdownMenuItem onSelect={() => { store([{ id: `${Date.now()}`, name: b ? `${a.name} vs ${b.name}` : a.name, saved_at: new Date().toISOString(), a, b }, ...saved].slice(0, 30)); toast.success("State saved", { description: "Scenario inputs only, in this browser." }); }}>
              <Save {...ICON} />Save current</DropdownMenuItem>
            {saved.length > 0 && <DropdownMenuSeparator />}
            {saved.map((s) => (
              <DropdownMenuItem key={s.id} title={`Saved ${new Date(s.saved_at).toLocaleString()}`} onSelect={() => {
                const pa = ScenarioSchema.safeParse(s.a), pb = s.b ? ScenarioSchema.safeParse(s.b) : null;
                if (!pa.success || (pb && !pb.success)) { toast.error("Saved state is no longer valid"); return; }
                set({ a: pa.data, b: pb?.success ? pb.data : null, editing: "a", presetId: null, replay: false, ra: null, rb: null, frame: 0, playing: false, interp: { state: "idle" }, chat: [] });
              }}><span className="truncate">{s.name}</span>
                <button type="button" className="ml-auto rounded p-0.5 text-faint hover:text-bad" aria-label={`Delete ${s.name}`} onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); e.preventDefault(); store(saved.filter((x) => x.id !== s.id)); }}><X {...ICON} /></button>
              </DropdownMenuItem>
            ))}
            {!saved.length && <DropdownMenuLabel className="normal-case tracking-normal">None saved.</DropdownMenuLabel>}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger><Layers {...ICON} />Layers</DropdownMenuSubTrigger>
          <DropdownMenuSubContent data-testid="layers-menu">
            {LAYERS.map((l) => <DropdownMenuCheckboxItem key={l.k} checked={layers[l.k]} onSelect={(e) => e.preventDefault()} onCheckedChange={(v) => set({ layers: { ...layers, [l.k]: !!v } })}>{l.label}</DropdownMenuCheckboxItem>)}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuCheckboxItem checked={assumptionsOpen} onCheckedChange={(v) => set({ assumptionsOpen: !!v })}>Assumptions &amp; evidence</DropdownMenuCheckboxItem>
        <DropdownMenuItem onSelect={() => set({ drawer: "outputs" })}><ListChecks {...ICON} />Results &amp; sources</DropdownMenuItem>
        <DropdownMenuItem onSelect={toggleFullscreen} data-testid="fullscreen"><Maximize {...ICON} />Fullscreen<span className="ea-kbd ml-auto">F</span></DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ---------- left: slim rail → 5 scenario rows (popover editors) + Advanced ---------- */
const ROWS: { k: ScenarioPart; label: string; icon: typeof Box }[] = [
  { k: "cabin", label: "Cabin", icon: Box }, { k: "materials", label: "Material", icon: FlaskConical }, { k: "fire", label: "Fire source", icon: Flame },
  { k: "detection", label: "Detector", icon: Bell }, { k: "suppression", label: "Extinguisher", icon: Wind },
];

function rowValue(sc: Scenario, k: ScenarioPart): string {
  const fire = sc.items.find((i) => i.ignite);
  switch (k) {
    case "cabin": return `${sig(sc.cabin.x_o2 * 100, 3)}% O₂ · ${sc.cabin.V_m3 == null ? "∅ volume" : `${sig(sc.cabin.V_m3, 3)} m³`}`;
    case "materials": return sc.items.length === 1 ? (materialByKey(sc.items[0].material_key)?.display_name ?? sc.items[0].material_key) : `${sc.items.length} items`;
    case "fire": return fire ? `${materialByKey(fire.material_key)?.display_name ?? fire.material_key} @ ${sig(fire.t_ignite_s, 3)} s` : "none";
    case "detection": return `${sc.detection.type} · ${sig(sc.detection.distance_m, 3)} m`;
    case "suppression": return sc.suppression.agent === "none" ? "none" : `${sc.suppression.agent} · ${sig(sc.suppression.mass_kg, 3)} kg`;
    default: return "";
  }
}

function LeftPanel() {
  const { a, b, editing, treeOpen, row, set } = useSim();
  if (!a) return null;
  const toggle = () => { set({ treeOpen: !treeOpen }); saveUi({ treeOpen: !treeOpen }); };
  const sc = editing === "b" && b ? b : a;
  const missing = missingFields(sc);
  return (
    <aside className={cn("relative z-20 flex shrink-0 border-line bg-bg lg:border-r", treeOpen ? "lg:w-72" : "lg:w-12")} aria-label="Scenario" data-noprint data-testid="rail">
      {!treeOpen ? (
        <div className="flex w-full items-center gap-1 px-2 py-1 lg:w-12 lg:flex-col lg:py-2">
          <Tip label="Open scenario" side="right"><Button variant="ghost" size="icon-sm" aria-label="Open scenario panel" aria-expanded={false} onClick={toggle}><PanelLeftOpen {...ICON} /></Button></Tip>
          {ROWS.map((r) => <span key={r.k} aria-hidden className={cn("hidden h-8 w-8 place-items-center text-faint lg:grid", r.k === "cabin" && missing.length > 0 && "text-warn")}><r.icon {...ICON} /></span>)}
        </div>
      ) : (
        <div className="flex min-h-0 w-full flex-col overflow-y-auto">
          <div className="flex items-center justify-between px-3 pb-1 pt-3">
            <p className="ea-meta">Scenario{b ? ` · editing ${editing.toUpperCase()}` : ""}</p>
            <Tip label="Collapse" side="right"><Button variant="ghost" size="icon-sm" aria-label="Collapse scenario panel" aria-expanded onClick={toggle}><PanelLeftClose {...ICON} /></Button></Tip>
          </div>
          {b && <div className="mx-3 mb-2 grid grid-cols-2 rounded-md border border-line p-0.5 text-[12px]" role="radiogroup" aria-label="Edit scenario">
            {(["a", "b"] as const).map((k) => <button key={k} type="button" role="radio" aria-checked={editing === k} className={cn("truncate rounded-[4px] px-2 py-1", editing === k ? "bg-surface2 text-ink" : "text-mute")} onClick={() => set({ editing: k })}>{k.toUpperCase()} · {(k === "a" ? a : b).name}</button>)}
          </div>}
          <ul className="border-y border-line">
            {ROWS.map((r) => (
              <li key={r.k} className="border-b border-line last:border-0">
                <Popover open={row === r.k} onOpenChange={(o) => set({ row: o ? r.k : null })}>
                  <PopoverTrigger asChild>
                    <button type="button" className="grid w-full grid-cols-[20px_84px_minmax(0,1fr)_12px] items-center gap-2 px-3 py-2.5 text-left text-[13px] transition-colors hover:bg-panel" data-testid={`row-${r.k}`}>
                      <r.icon {...ICON} className={cn("text-faint", r.k === "cabin" && missing.length > 0 && "text-warn")} />
                      <span>{r.label}</span>
                      <span className="num truncate text-[12px] text-mute">{rowValue(sc, r.k)}</span>
                      <ChevronRight size={12} strokeWidth={1.5} className="text-faint" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent side="right" align="start" className="max-h-[80vh] w-[340px] overflow-y-auto">
                    <ScenarioPanel only={r.k} />
                  </PopoverContent>
                </Popover>
              </li>
            ))}
          </ul>
          <Collapsible className="border-b border-line">
            <CollapsibleTrigger className="group flex w-full items-center gap-2 px-3 py-2.5 text-left text-[13px] text-mute hover:text-ink" data-testid="advanced">
              <ChevronDown size={12} strokeWidth={1.5} className="-rotate-90 transition-transform group-data-[state=open]:rotate-0" />Advanced
              <span className="ml-auto truncate font-mono text-[11px] text-faint">pressure · flow · gravity</span>
            </CollapsibleTrigger>
            <CollapsibleContent className="px-3 pb-3">
              <ScenarioPanel only="advanced" />
              <p className="mt-2 border-t border-line pt-2 text-[12px] text-mute">Monte Carlo: <span className="num">{MC_N}</span> runs per scenario, fixed seed (uncertainty bands).</p>
            </CollapsibleContent>
          </Collapsible>
          <Collapsible>
            <CollapsibleTrigger className="group flex w-full items-center gap-2 px-3 py-2.5 text-left text-[13px] text-mute hover:text-ink">
              <ChevronDown size={12} strokeWidth={1.5} className="-rotate-90 transition-transform group-data-[state=open]:rotate-0" /><Sparkles {...ICON} />Describe with AI · presets
            </CollapsibleTrigger>
            <CollapsibleContent className="px-3 pb-3"><ScenarioPanel only="setup" /></CollapsibleContent>
          </Collapsible>
        </div>
      )}
    </aside>
  );
}

/* ---------- centre: viewport, result strip, chart strip ---------- */
function Center() {
  const { a, b, ra, rb, frame, runError, assumptionsOpen, view, running } = useSim();
  if (!a) return null;
  const missing = [...missingFields(a), ...(b ? missingFields(b).map((m) => `B: ${m}`) : [])];
  const views = [{ sc: a, r: ra, label: b ? `A · ${a.name}` : a.name }, ...(b ? [{ sc: b, r: rb, label: `B · ${b.name}` }] : [])];
  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col" aria-label="Simulation viewport">
      <div className="viewport3d relative min-h-[60vh] flex-1 bg-bg lg:min-h-0" data-testid="viewport">
        {view === "3d" ? <Scene3D views={views} frame={frame} />
          : <div className={`grid h-full ${b ? "grid-cols-2 divide-x divide-line" : ""}`}>
              <CabinView sc={a} r={ra} frame={frame} label={b ? `A · ${a.name}` : a.name} compact={!!b} />
              {b && <CabinView sc={b} r={rb} frame={frame} label={`B · ${b.name}`} compact />}
            </div>}
        {missing.length > 0 && view !== "3d" && <p id="run-missing-note" className="absolute inset-x-2 top-2 z-10 rounded-md border border-warn/50 bg-panel px-2 py-1 text-[13px] text-warn">Enter {missing.join(", ")} to run: there is no sourced value.</p>}
        {runError && <p className="absolute inset-x-2 top-10 z-10 rounded-md bg-panel px-2 text-[13px] text-bad" role="alert">Run failed: {runError}</p>}
        {running && <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-0.5 overflow-hidden bg-line" aria-hidden><div className="ea-indeterminate h-full w-1/3 bg-ember" /></div>}
        <ViewportCorner />
        {assumptionsOpen && <Assumptions sc={a} r={ra} />}
      </div>
      <ResultStrip />
      <Dock />
    </section>
  );
}

/** Bottom-right of the viewport: camera presets (3D only) and the details/legend popover. */
function ViewportCorner() {
  const { a, b, ra, rb, view, frame, set } = useSim();
  if (!a) return null;
  return (
    <div className="absolute bottom-3 right-3 z-20 flex items-center gap-1" data-noprint>
      {view === "3d" && <DropdownMenu>
        <Tip label="Camera presets" kbd="1–4"><DropdownMenuTrigger asChild><Button variant="secondary" size="icon-sm" className="bg-panel/80 backdrop-blur" aria-label="Camera"><Camera {...ICON} /></Button></DropdownMenuTrigger></Tip>
        <DropdownMenuContent align="end" side="top">
          {PRESET_LABELS.map((l, i) => <DropdownMenuItem key={l} onSelect={() => set({ camPreset: { id: i + 1, nonce: Date.now() } })}><span className="ea-kbd">{i + 1}</span>{l}</DropdownMenuItem>)}
        </DropdownMenuContent>
      </DropdownMenu>}
      <Popover>
        <Tip label="Details and legend"><PopoverTrigger asChild><Button variant="secondary" size="icon-sm" className="bg-panel/80 backdrop-blur" aria-label="Details" data-testid="details"><Info {...ICON} /></Button></PopoverTrigger></Tip>
        <PopoverContent side="top" align="end" className="max-h-[70vh] w-[380px] space-y-3 overflow-y-auto text-[12px]" data-testid="details-popover">
          <div className="space-y-2"><p className="ea-meta">{b ? `A · ${a.name}` : a.name}</p><HudExtras sc={a} r={ra} frame={frame} /><Mitigation sc={a} r={ra} label={null} frame={frame} /></div>
          {b && <div className="space-y-2 border-t border-line pt-2"><p className="ea-meta">B · {b.name}</p><HudExtras sc={b} r={rb} frame={frame} /><Mitigation sc={b} r={rb} label={null} frame={frame} /></div>}
          <div className="border-t border-line pt-2"><p className="ea-meta mb-1.5 flex items-center gap-1"><HelpCircle size={12} strokeWidth={1.5} />Legend</p><Legend /></div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

/** One line: the big result, EXTRAPOLATED, Next test, Ask the AI. */
function ResultStrip() {
  const { a, b, ra, rb, running, set } = useSim();
  if (!a) return null;
  if (running && !ra) return <div className="flex h-12 items-center gap-3 border-t border-line px-4" aria-busy="true" data-testid="result-skeleton"><div className="h-4 w-72 animate-pulse rounded bg-surface2" /><div className="h-4 w-24 animate-pulse rounded bg-surface2" /></div>;
  if (!ra) return null;
  const metric = (r: SimResult, k: string) => r.outcome.metrics.find((m) => m.key === k) ?? null;
  const oob = [...(b ? outOfEnvelope(b) : []), ...outOfEnvelope(a)];
  const seen = new Set<string>();
  const oobText = oob.filter((o) => (seen.has(o.text) ? false : (seen.add(o.text), true))).map((o) => o.text);
  const sc = b && rb ? b : a, r = b && rb ? rb : ra;
  const nt = nextTest(sc, r);
  let headline: React.ReactNode = "No data";
  const DELTA = [["time_to_extinguish", "burns out"], ["peak_T", "peaks at"], ["peak_co", "peaks in CO at"]] as const;
  if (b && rb) {
    const pick = DELTA.find(([k]) => metric(ra, k)?.value != null && metric(rb, k)?.value != null);
    if (pick) {
      const [k, verb] = pick, va = metric(ra, k)!.value as number, vb = metric(rb, k)!.value as number, u = metric(ra, k)!.units;
      const time = k === "time_to_extinguish";
      const ratio = time && va > 0 && vb > 0 ? Math.max(va, vb) / Math.min(va, vb) : null;
      headline = <>{b.name} {verb} {ratio != null ? <><span className="num text-ember-text">{sig(ratio, 2)}×</span> {vb < va ? "faster" : vb > va ? "slower" : "the same"}</> : <span className="num">{withUnit(vb, u)}</span>}
        <span className="ml-2 font-mono text-[12px] font-normal text-mute">{a.name} <span className="num">{withUnit(va, u)}</span> → {b.name} <span className="num">{withUnit(vb, u)}</span></span></>;
    }
  } else {
    const m = metric(ra, "time_to_extinguish")?.value != null ? metric(ra, "time_to_extinguish") : metric(ra, "peak_T");
    if (m?.value != null) headline = <>{m.label} <span className="num text-ember-text">{withUnit(m.value, m.units)}</span></>;
  }
  return (
    <section data-testid="delta-card" className="flex min-h-12 flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-line bg-bg px-4 py-2" aria-label="Result">
      <p className="min-w-0 text-[16px] font-semibold tracking-[-0.01em]" data-testid="result-headline">{headline}</p>
      {oobText.length > 0 && <Tip label={oobText.join(" · ")}><span data-testid="extrapolated" className="ea-pill" data-tone="warn">Extrapolated</span></Tip>}
      <span className="flex-1" />
      <Popover>
        <PopoverTrigger asChild><Button variant="secondary" size="sm" className="h-8" data-testid="next-test-btn"><FlaskConical {...ICON} />Next test</Button></PopoverTrigger>
        <PopoverContent side="top" align="end" className="w-[380px]">
          <p className="ea-meta mb-1">Next test to fly</p>
          {nt ? <p className="text-[13px]"><b>{nt.condition}.</b> <span className="text-mute">{nt.reason}</span></p> : <p className="text-[13px] text-mute">Inside the tested envelope, no new test needed for this scenario</p>}
          <div className="mt-2"><NextTest sc={sc} r={r} /></div>
        </PopoverContent>
      </Popover>
      <Button size="sm" className="h-8" data-testid="ask-ai" onClick={() => set({ drawer: "ai" })}><Sparkles {...ICON} />Ask the AI</Button>
    </section>
  );
}

function Assumptions({ sc, r }: { sc: Scenario; r: SimResult | null }) {
  const set = useSim((s) => s.set);
  const theory = r ? Object.entries(r.provenance.params).filter(([, p]) => !p.calibrated) : [];
  const partial = sc.cabin.gravity_g > 0 && sc.cabin.gravity_g < 1;
  return (
    <div className="absolute inset-y-0 right-0 z-30 w-[min(420px,100%)] overflow-y-auto border-l border-line bg-panel p-4 text-[13px]" role="dialog" aria-label="Assumptions and evidence" data-testid="assumptions">
      <div className="flex items-center justify-between"><p className="ea-meta">Assumptions / evidence</p><Button variant="ghost" size="icon-sm" aria-label="Close assumptions" onClick={() => set({ assumptionsOpen: false })}><X {...ICON} /></Button></div>
      <ul className="mt-2 list-disc space-y-1 pl-4 text-mute">
        <li>Engine: single well-mixed cabin zone (CFAST-like) with a 1-D flame front per item; partial gravity is estimated between µg and 1 g and may be non-conservative (NASA FM2 lunar-g tests).</li>
        <li>Spread uses the opposed-flow equivalent velocity; the viewport draws ventilation opposite to spread accordingly.</li>
        <li>Smoke reaches the detector after τ = distance / flow (no transport when flow is 0); the detector reading is the lagged well-mixed concentration.</li>
        <li>Alarm only when the detector crosses its threshold or at a crew-reported time; with no threshold the alarm is not computed (No data).</li>
        <li>Agent release is instant and well-mixed (single zone). Fan-off stops transport.</li>
        <li>Drawn to scale: item length/width, flame front, burning length, detector distance. Schematic: module interior (hull, racks, bulkheads, perspective), item spacing, flame height/lean, plume rise.</li>
        <li>Flame size and brightness follow the engine&apos;s burning length, heat release Q (relative to this run&apos;s peak) and current O₂ relative to the initial O₂; lean follows u; it is taller with gravity and squatter in µg. Dashed flame outline = spread model theory-only.</li>
        <li>Detector circle radius = transport distance d (a scenario input); the engine models no sensing radius. It turns solid only when the engine reports smoke at the detector and red only on the alarm event.</li>
      </ul>
      <div className="mt-2 flex flex-wrap gap-1">{theory.map(([k]) => <TheoryBadge key={k} what={k} />)}{partial && <BoundedBadge />}</div>
      {r?.warnings.length ? <><p className="ea-meta mt-3">Engine warnings</p><ul className="space-y-0.5 text-[12px] text-warn">{r.warnings.map((w, i) => <li key={i}>⚠ {w}</li>)}</ul></> : null}
      {r && <><p className="ea-meta mt-3">Calibration</p>
        <ul className="space-y-0.5 text-[12px]">{Object.entries(r.provenance.params).map(([k, p]) => <li key={k}><span className="font-medium">{k}</span>: {p.calibrated ? "calibrated" : "◌ theory-only"} · <span className="text-mute">{p.source}</span></li>)}</ul>
        <p className="ea-meta mt-3">Sources</p>
        <ul className="space-y-0.5 text-[12px]">{r.provenance.sources.map((s, i) => <li key={i} className="border-l-2 border-line pl-2">{fmtProv(s)}</li>)}</ul>
        <p className="mt-3 font-mono text-[11px] text-faint">EmberAtlas {r.provenance.engine_version} · seed {r.provenance.seed} · {MC_N} MC runs · spread test error {spreadCal.metrics.test_mape_pct} % (n = {spreadCal.metrics.test.length}) · SI internal</p></>}
      {!r && <p className="mt-3 text-mute">Run the scenario to see calibration, warnings and sources.</p>}
    </div>
  );
}

/** Charts: a thin strip (one button) until expanded; tabs only when open. */
function Dock() {
  const { a, ra, rb, frame, replay, dockTab, dockOpen, dockVh, set } = useSim();
  const [vh, setVh] = useState(900);
  useEffect(() => { const f = () => setVh(window.innerHeight); f(); window.addEventListener("resize", f); return () => window.removeEventListener("resize", f); }, []);
  if (!a) return null;
  const tabs: [string, string][] = [...CHARTS.map((c) => [c.lines[0].f, c.title] as [string, string]), ...(replay ? [["replay", "Replay check"] as [string, string]] : [])];
  const err = replay && ra && TELEMETRY ? replayError(ra, TELEMETRY) : null;
  const toggle = (open = !dockOpen) => { set({ dockOpen: open }); saveUi({ dockOpen: open }); };
  const hPx = Math.round((dockVh / 100) * vh), chartH = Math.max(120, hPx - 48);
  if (!dockOpen) return (
    <div className="flex h-9 shrink-0 items-center border-t border-line bg-bg" data-testid="dock" data-open="false">
      <Tip label="Expand charts" kbd="C">
        <button type="button" className="flex h-full min-w-0 flex-1 items-center gap-3 px-4 text-left text-[12px] text-mute hover:text-ink" aria-expanded={false} aria-label="Expand chart dock" onClick={() => toggle(true)}>
          <ChevronDown size={12} strokeWidth={1.5} className="rotate-180" /><span className="ea-meta">Charts</span>
          <span className="truncate">{tabs.map(([, l]) => l).join(" · ")}</span>
          <Sparkline r={ra} field={dockTab} frame={frame} />
        </button>
      </Tip>
    </div>
  );
  const drag = (e: React.PointerEvent) => {
    e.preventDefault(); const y0 = e.clientY, h0 = dockVh;
    const move = (ev: PointerEvent) => { const v = Math.max(15, Math.min(70, h0 + ((y0 - ev.clientY) / window.innerHeight) * 100)); set({ dockVh: v }); };
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); saveUi({ dockVh: useSim.getState().dockVh }); };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
  };
  return (
    <div className="relative flex shrink-0 flex-col border-t border-line" style={{ height: hPx }} data-testid="dock" data-open="true">
      <div className="absolute inset-x-0 -top-1 z-10 h-2 cursor-row-resize" onPointerDown={drag} role="separator" aria-orientation="horizontal" aria-label="Resize chart dock" />
      <div className="flex items-center gap-1 border-b border-line px-2">
        <Tip label="Collapse charts" kbd="C"><Button variant="ghost" size="icon-sm" aria-expanded aria-label="Collapse chart dock" onClick={() => toggle(false)}><ChevronDown size={12} strokeWidth={1.5} /></Button></Tip>
        <div className="flex min-w-0 items-center gap-1 overflow-x-auto" role="tablist" aria-label="Charts">
          {tabs.map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={dockTab === k} className={cn("relative whitespace-nowrap px-2 py-2 text-[12px]", dockTab === k ? "text-ink after:absolute after:inset-x-2 after:-bottom-px after:h-px after:bg-ember" : "text-mute hover:text-ink")} onClick={() => set({ dockTab: k })}>{l}</button>)}
        </div>
      </div>
      <div className="min-h-0 flex-1 px-2" role="tabpanel">
        {dockTab === "replay" ? (
          <section className="h-full overflow-y-auto py-1" data-testid="telemetry-overlay">
            <p className="text-[12px] text-mute">Open circles on the charts are measured values from {TELEMETRY?.source_id ?? "PSI-100"} · {TELEMETRY?.locator ?? "telemetry not ingested"}. The error is shown as computed, good or bad.</p>
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_260px]">
              <div>
                <p className="ea-meta">Cabin-scale sanity check</p>
                <p className="text-[12px] text-mute">A sample-size Saffire fire barely changes a vehicle&apos;s cabin; the model reproduces that near-ambient response, computed live. This is not a test of flame-spread physics.</p>
                {ra ? <ReplayMetrics err={err} /> : <p className="text-[12px] text-mute">Run to compute the replay error.</p>}
              </div>
              <SpreadCalibration />
            </div>
          </section>
        ) : ra ? <Charts ra={ra} rb={rb} sa={a} frame={frame} replay={replay} only={dockTab as never} height={chartH} />
          : <div className="flex h-full items-center justify-center gap-3" aria-busy="true"><div className="h-3 w-1/3 animate-pulse rounded bg-surface2" /><p className="text-[13px] text-mute">Run to simulate {sig(a.t_end_s, 3)} s ({MC_N} Monte Carlo runs for the bands).</p></div>}
      </div>
    </div>
  );
}

function Sparkline({ r, field, frame }: { r: SimResult | null; field: string; frame: number }) {
  if (!r || !(field in (r.state[0] ?? {}))) return null;
  const ys = r.state.map((s) => (s as unknown as Record<string, number>)[field]);
  const lo = Math.min(...ys), hi = Math.max(...ys), W = 160, H = 18;
  const step = Math.max(1, Math.floor(ys.length / 120));
  const pts = ys.filter((_, i) => i % step === 0).map((y, i, arr) => `${((i / Math.max(1, arr.length - 1)) * W).toFixed(1)},${(H - 2 - ((y - lo) / (hi - lo || 1)) * (H - 4)).toFixed(1)}`).join(" ");
  const f = Math.min(frame, ys.length - 1), px = (f / Math.max(1, ys.length - 1)) * W;
  return (
    <svg width={W} height={H} className="ml-auto shrink-0" aria-hidden data-testid="sparkline">
      <polyline points={pts} fill="none" stroke="#5AA9FF" strokeWidth={1.2} />
      <line x1={px} x2={px} y1={0} y2={H} stroke="#FF6B2C" strokeWidth={1} />
    </svg>
  );
}

/* ---------- right: AI drawer (interpretation, suggested questions, citations, guard) + results + evidence ---------- */
const SUGGESTED = ["What should I change first?", "Why is this extrapolated?", "Which NASA test is closest to this cabin?"];

async function ask(question: string) {
  const { a, ra, b, rb, set, chat } = useSim.getState();
  if (!a || !ra) return;
  set({ asking: true, chat: [...chat, { role: "user", text: question }] });
  try {
    const res = await fetch("/api/interpret", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, scenario: a, result: compact(ra), evidence: evidenceForAI(a), ...(b && rb && { compare: { scenario: b, result: compact(rb) } }) }),
    });
    const j = await res.json().catch(() => ({}));
    const msg: ChatMsg = res.ok ? { role: "assistant", text: j.text, citations: j.citations ?? [], stripped: !!j.guard?.stripped } : { role: "assistant", text: j.error ?? `AI unavailable (${res.status})`, error: true };
    useSim.getState().set({ chat: [...useSim.getState().chat, msg], asking: false });
  } catch (e) {
    toast.error("AI request failed", { description: String(e) });
    useSim.getState().set({ chat: [...useSim.getState().chat, { role: "assistant", text: String(e), error: true }], asking: false });
  }
}

function Cites({ ids }: { ids?: string[] }) {
  if (!ids?.length) return null;
  return <div className="flex flex-wrap gap-1.5">{ids.map((c) => <a key={c} href={`/evidence#${c.toLowerCase()}`} className="ea-pill hover:text-ink" data-tone="ember">{c}</a>)}</div>;
}

function AiDrawer() {
  const { a, b, ra, rb, drawer, interp, chat, asking, frame, set } = useSim();
  const [q, setQ] = useState("");
  const close = useCallback(() => set({ drawer: null }), [set]);
  useEffect(() => {
    if (!drawer) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }, [drawer, close]);
  if (!a || !drawer) return null;
  const tabs = [["ai", "AI"], ["outputs", "Results"], ["evidence", "Evidence"]] as const;
  return (
    <aside className="ea-drawer absolute inset-y-0 right-0 z-40 flex w-full flex-col border-l border-line bg-panel sm:w-[420px]" aria-label="AI and results" data-testid="ai-drawer">
      <div className="flex items-center gap-1 border-b border-line px-2">
        <div className="flex flex-1 items-center" role="tablist" aria-label="Drawer">
          {tabs.map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={drawer === k} data-testid={`tab-${k}`} className={cn("relative px-3 py-3 text-[13px]", drawer === k ? "text-ink after:absolute after:inset-x-3 after:-bottom-px after:h-px after:bg-ember" : "text-mute hover:text-ink")} onClick={() => set({ drawer: k })}>{l}</button>)}
        </div>
        <Tip label="Close" kbd="Esc"><Button variant="ghost" size="icon-sm" aria-label="Close drawer" onClick={close}><X {...ICON} /></Button></Tip>
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4" role="tabpanel">
        {drawer === "ai" && <>
          <Interpretation />
          {interp.state === "ok" && <div className="space-y-2">
            <Cites ids={interp.citations} />
            <p className="flex items-center gap-1.5 text-[12px] text-ok" data-testid="guard"><ShieldCheck {...ICON} />Numbers checked against the engine output ✓</p>
          </div>}
          {chat.map((m, i) => m.role === "user"
            ? <p key={i} className="rounded-md border border-line bg-bg p-3 text-[13px]"><span className="ea-meta mr-1">You</span>{m.text}</p>
            : <div key={i} className="space-y-2 text-[14px]"><p className={cn("whitespace-pre-line", m.error && "text-warn")}>{m.text}</p><Cites ids={m.citations} />
                {!m.error && <p className="flex items-center gap-1.5 text-[12px] text-ok"><Check {...ICON} />{m.stripped ? "Unsupported claims removed" : "Numbers checked ✓"}</p>}</div>)}
          {asking && <div className="space-y-2" aria-busy="true"><div className="h-3 w-5/6 animate-pulse rounded bg-surface2" /><div className="h-3 w-2/3 animate-pulse rounded bg-surface2" /></div>}
          <div className="space-y-1.5"><p className="ea-meta">Suggested</p>
            {SUGGESTED.map((s) => <button key={s} type="button" disabled={!ra || asking} className="block w-full rounded-md border border-line px-3 py-2 text-left text-[13px] text-mute transition-colors hover:border-faint/50 hover:text-ink disabled:opacity-50" onClick={() => void ask(s)}>{s}</button>)}
          </div>
        </>}
        {drawer === "outputs" && <div className="space-y-3">
          <Mitigation sc={a} r={ra} label={b ? "A" : "Now"} frame={frame} />
          {b && <Mitigation sc={b} r={rb} label="B" frame={frame} />}
          <Outcome sc={a} r={ra} label={b ? "A" : null} />
          {b && rb && <Outcome sc={b} r={rb} label="B" />}
          {b && rb ? <DesignReview sc={b} r={rb} label="B" /> : <DesignReview sc={a} r={ra} />}
          <Tornado sc={b ?? a} />
        </div>}
        {drawer === "evidence" && <Evidence sc={a} />}
      </div>
      {drawer === "ai" && <form className="flex gap-2 border-t border-line p-3" onSubmit={(e) => { e.preventDefault(); const t = q.trim(); if (t) { setQ(""); void ask(t); } }}>
        <input type="text" className="min-w-0 flex-1" aria-label="Question for the AI" placeholder={ra ? "Ask about this run…" : "Run first"} value={q} maxLength={800} disabled={!ra} onChange={(e) => setQ(e.target.value)} />
        <Button size="sm" className="h-8" disabled={!ra || asking || !q.trim()}>Ask</Button>
      </form>}
    </aside>
  );
}

/** Status at the playhead, strictly from engine state/events and scenario inputs (T, CO, detector, fan, agent, items). */
function Mitigation({ sc, r, label, frame }: { sc: Scenario; r: SimResult | null; label: string | null; frame: number }) {
  const F = runFacts(sc, r);
  const t = r ? r.t[Math.min(frame, r.t.length - 1)] : 0;
  const at = (x: number | null | undefined) => x != null && t >= x;
  const f = r ? Math.min(frame, r.t.length - 1) : 0;
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
  return (
    <section className="space-y-1 text-[12px]" data-testid="mitigation">
      {label && <p className="ea-meta">Status · {label}{r && <span className="num ml-1 normal-case tracking-normal">@ {sig(r.t[f], 3)} s</span>}</p>}
      <div className="grid grid-cols-[92px_minmax(0,1fr)] gap-x-2 gap-y-0.5">
        <span className="text-mute">Detection</span><span>{det}</span>
        <span className="text-mute">Ventilation</span><span>{fan}</span>
        <span className="text-mute">Suppression</span><span>{sup}</span>
        {sc.items.map((it) => {
          const tr = r?.items.find((x) => x.id === it.id);
          const s = tr?.status[f];
          return <div key={it.id} className="contents"><span className="truncate text-mute" title={it.id}>{materialByKey(it.material_key)?.display_name ?? it.id}</span>
            <span>{!s ? "not run" : s === "burning" ? <span>● burning</span> : s === "out" ? `✕ extinct (${tr?.extinguish_reason ?? "—"})` : "○ not ignited"}</span></div>;
        })}
      </div>
    </section>
  );
}

function SpreadCalibration() {
  const test = (spreadCal.metrics?.test ?? []) as { sample: string; rel_err: number }[];
  return (
    <aside className="border-l border-line pl-3 text-[12px]" data-testid="spread-calibration">
      <p className="ea-meta">Model check: flame spread</p>
      <p>Spread calibration on held-out SIBAL: <span className="num">{sig(spreadCal.metrics.test_mape_pct, 3)}%</span> error, n = <span className="num">{test.length}</span></p>
      {test.map((t) => <p key={t.sample} className="num text-faint">{t.sample}: rel. err {sig(t.rel_err * 100, 3)}%</p>)}
    </aside>
  );
}
