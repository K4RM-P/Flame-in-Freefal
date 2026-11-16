"use client";
// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// The 3D viewport shell: client-only <Canvas> (dynamic, ssr:false), WebGL detection with an SVG Elevation fallback,
// an error boundary (same fallback), a loader, HUD glass chips read from the current engine frame, the honesty
// caption, and the "Ready · press Run (R)" empty state. Never renders a black screen.
import dynamic from "next/dynamic";
import { Component, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Scenario, SimResult } from "@/lib/sim/types";
import { sig } from "@/lib/ui/format";
import { Num, missingFields, playPause } from "../bits";
import { CabinView } from "../CabinView";
import { useSim } from "../store";
import { runSummary, visualState } from "./frame";
import { layoutOf } from "./vis";

function Loader({ text = "Loading 3D cabin…" }: { text?: string }) {
  return <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(ellipse_at_center,rgb(var(--surface2)),rgb(var(--bg)))]" data-testid="scene3d-loading">
    <span className="glass px-3 py-1.5 text-[13px] text-mute">{text}</span>
  </div>;
}
const Canvas3D = dynamic(() => import("./Canvas3D"), { ssr: false, loading: () => <Loader /> });

function hasWebGL() {
  try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch { return false; }
}

class Boundary extends Component<{ fallback: ReactNode; children: ReactNode }, { err: boolean }> {
  state = { err: false };
  static getDerivedStateFromError() { return { err: true }; }
  componentDidCatch(e: unknown) { console.warn("[3d] falling back to the SVG elevation view:", e); }
  render() { return this.state.err ? this.props.fallback : this.props.children; }
}

export interface SceneView { sc: Scenario; r: SimResult | null; label: string }

export function Scene3D({ views, frame }: { views: SceneView[]; frame: number }) {
  const [gl, setGl] = useState<"checking" | "ok" | "none">("checking");
  const [present, setPresent] = useState(false), [lowfx, setLowfx] = useState(false);
  useEffect(() => {
    setGl(hasWebGL() ? "ok" : "none");
    const q = new URLSearchParams(window.location.search); setPresent(q.get("present") === "1"); setLowfx(q.get("lowfx") === "1");
  }, []);
  const fallback = <div className={`grid h-full ${views.length > 1 ? "grid-cols-2 divide-x divide-line" : ""}`} data-testid="scene3d-fallback">
    {views.map((v) => <CabinView key={v.label} sc={v.sc} r={v.r} frame={frame} label={v.label} compact={views.length > 1} forceView="elevation" />)}
  </div>;
  const specs = useMemo(() => views.map((v) => ({ sc: v.sc, r: v.r })), [views]);
  if (gl === "checking") return <Loader />;
  if (gl === "none") return <div className="absolute inset-0">{fallback}<p className="glass absolute left-2 top-2 px-2 py-1 text-[12px] text-warn">WebGL unavailable: showing the 2D elevation view</p></div>;
  return (
    <div className="absolute inset-0 overflow-hidden" data-testid="scene3d">
      <Boundary fallback={fallback}>
        <Canvas3D views={specs} present={present} lowfx={lowfx} />
      </Boundary>
      <div className={`pointer-events-none absolute inset-0 grid ${views.length > 1 ? "grid-cols-2" : ""}`}>
        {views.map((v) => <Hud3D key={v.label} v={v} frame={frame} compact={views.length > 1} />)}
      </div>
    </div>
  );
}

/** Four HUD chips only: time, heat (kW), O₂ %, alarm state. Everything else is in the ⓘ details popover (HudExtras). */
function Hud3D({ v, frame, compact }: { v: SceneView; frame: number; compact: boolean }) {
  const { sc, r, label } = v;
  const running = useSim((s) => s.running);
  const S = visualState(sc, r, frame);
  const noThreshold = sc.detection.threshold == null && sc.detection.manual_alarm_s == null;
  const chip = "glass flex items-baseline gap-1.5 px-2 py-1 font-mono text-[12px] hud3d";
  const missing = missingFields(sc);
  return (
    <div className="relative h-full min-w-0" data-testid="hud3d">
      <div className="absolute left-3 top-3 flex max-w-[calc(100%-1.5rem)] flex-wrap items-center gap-1.5">
        {compact && <span className="glass px-2 py-1 text-[12px] font-medium">{label.split(" · ")[0]}</span>}
        <span className={chip}><span className="text-faint">T+</span><span className="num" data-testid="hud-time">{r ? `${sig(S.t, 3)} s` : "—"}</span></span>
        <span className={chip}><span className="text-faint">HEAT</span><span className="num" data-testid="hud-heat">{r && S.hud.Q_W != null ? `${sig(S.hud.Q_W / 1e3, 3)} kW` : "—"}</span></span>
        <span className={chip}><span className="text-faint">O₂</span><span className="num" data-testid="hud-o2">{r && S.hud.x_o2 != null ? `${sig(S.hud.x_o2 * 100, 3)} %` : `${sig(sc.cabin.x_o2 * 100, 3)} %`}</span></span>
        <span className={`${chip} ${S.alarm ? "border-bad/60 text-bad" : "text-mute"}`} data-testid="hud-alarm">
          {!r ? "detector: not run" : noThreshold ? "∅ alarm: no detector threshold" : S.alarm ? `▲ ALARM · ${sig(S.tAlarm!, 3)} s` : S.tAlarm == null ? "○ monitoring · no alarm in run" : "○ monitoring"}
        </span>
      </div>
      {/* empty state: the module plus a centred Run prompt */}
      {!r && <div className="absolute inset-0 grid place-items-center" data-testid="scene-empty">
        <div className="glass pointer-events-auto flex items-center gap-3 rounded-[10px] px-4 py-3">
          {!missing.length && <button type="button" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ember text-[14px] text-black transition-transform active:translate-y-px disabled:opacity-60" disabled={running} aria-label="Run simulation" title="Run (R)" data-testid="play-center" onClick={() => void playPause()}>{running ? "…" : "▶"}</button>}
          <div>
            <p className="text-[15px] font-medium">{running ? "Simulating…" : missing.length ? "Inputs needed" : <>Ready · Run <span className="ea-kbd ml-1">R</span></>}</p>
            <p className="mt-0.5 text-[12px] text-mute">{missing.length ? `Enter ${missing.join(", ")}: there is no sourced value.` : `${sc.items.length} unburnt item${sc.items.length > 1 ? "s" : ""} · ${sig(sc.cabin.x_o2 * 100, 3)}% O₂ · ${sig(sc.cabin.gravity_g, 3)} g`}</p>
          </div>
        </div>
      </div>}
    </div>
  );
}

/** Details that used to crowd the HUD: T, CO (with receipts), smoke/theory/bounded/limit flags and the honesty caption. */
export function HudExtras({ sc, r, frame }: { sc: Scenario; r: SimResult | null; frame: number }) {
  const S = visualState(sc, r, frame);
  const sum = r ? runSummary(r) : null;
  const L = layoutOf(sc);
  const f = r ? Math.min(frame, r.t.length - 1) : 0;
  const src = r ? [{ source_id: "engine run", note: `EmberAtlas ${r.provenance.engine_version}, seed ${r.provenance.seed} at t = ${sig(r.t[f], 3)} s` }, ...r.provenance.sources.slice(0, 6)] : [];
  return (
    <div className="space-y-2 text-[12px]">
      {r && <div className="grid grid-cols-[92px_minmax(0,1fr)] gap-x-2 gap-y-0.5">
        <span className="text-mute">Heat release</span><Num value={S.hud.Q_W! / 1e3} units="kW" title="Heat release at playhead" sources={src} />
        <span className="text-mute">O₂</span><Num value={S.hud.x_o2! * 100} units="%" title="Cabin O₂ at playhead" sources={src} />
        <span className="text-mute">Temperature</span><Num value={S.hud.T_K} units="K" title="Cabin temperature at playhead" sources={src} />
        <span className="text-mute">CO</span><Num value={S.hud.x_co_ppm} units="ppm" title="Cabin CO at playhead" sources={src} />
      </div>}
      <div className="flex flex-wrap gap-1">
        {r && sum?.noYield && <span className="ea-pill" data-testid="smoke-nodata" title="No sourced smoke yield: no smoke particles are drawn">smoke: ∅ no data</span>}
        {S.theory.spread && <a href="/methods#overview" className="ea-pill">◌ theory-only</a>}
        {S.gravityMode === "partial" && <span className="ea-pill" data-tone="warn" title="Partial gravity (1/6 g) is estimated between µg and 1 g. NASA's FM2 lunar-gravity tests show some materials burn more readily at lunar g than at either, so this estimate may be non-conservative.">estimate · may be non-conservative · {sig(S.gravity_g, 3)} g</span>}
        {L.detClamped && <span className="ea-pill" data-tone="warn">detector beyond module end: drawn at the bulkhead</span>}
        {S.limits.map((l, i) => <span key={i} className="ea-pill" data-tone="bad" data-testid="limit-chip">⚠ {l.label} · {l.source}</span>)}
        {r && S.fanOff && <span className="ea-pill">■ fan off</span>}
        {S.agent && <span className="ea-pill">▨ {S.agent.kind} released</span>}
      </div>
      <div className="space-y-0.5 font-mono text-[11px] leading-snug text-faint" data-testid="scene-caption">
        <p>Fire state: engine frame {r ? f + 1 : 0}/{r?.t.length ?? 0} · t={r ? sig(S.t, 3) : "—"}s · items, front and detector distance to scale · module illustrative</p>
        <p>Module geometry illustrative · volume V = {sc.cabin.V_m3 != null ? sig(sc.cabin.V_m3, 3) : "∅"} m³ from scenario</p>
      </div>
    </div>
  );
}
