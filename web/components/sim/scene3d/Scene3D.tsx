"use client";
// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// The 3D viewport shell: client-only <Canvas> (dynamic, ssr:false), WebGL detection with an SVG Elevation fallback,
// an error boundary (same fallback), a loader, HUD glass chips read from the current engine frame, the honesty
// caption, and the "Ready · press Run (R)" empty state. Never renders a black screen.
import dynamic from "next/dynamic";
import { Component, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Scenario, SimResult } from "@/lib/sim/types";
import { sig } from "@/lib/ui/format";
import { Num, missingFields } from "../bits";
import { CabinView } from "../CabinView";
import { useSim } from "../store";
import { runSummary, visualState } from "./frame";
import { layoutOf } from "./vis";

function Loader({ text = "Loading 3D cabin…" }: { text?: string }) {
  return <div className="grid h-full w-full place-items-center bg-[radial-gradient(ellipse_at_center,rgb(var(--surface2)),rgb(var(--bg)))]" data-testid="scene3d-loading">
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
  if (gl === "none") return <div className="relative h-full">{fallback}<p className="glass absolute left-2 top-2 px-2 py-1 text-[12px] text-warn">WebGL unavailable: showing the 2D elevation view</p></div>;
  return (
    <div className="relative h-full w-full overflow-hidden" data-testid="scene3d">
      <Boundary fallback={fallback}>
        <Canvas3D views={specs} present={present} lowfx={lowfx} />
      </Boundary>
      <div className={`pointer-events-none absolute inset-0 grid ${views.length > 1 ? "grid-cols-2" : ""}`}>
        {views.map((v) => <Hud3D key={v.label} v={v} frame={frame} compact={views.length > 1} />)}
      </div>
    </div>
  );
}

function Hud3D({ v, frame, compact }: { v: SceneView; frame: number; compact: boolean }) {
  const { sc, r, label } = v;
  const running = useSim((s) => s.running);
  const S = visualState(sc, r, frame);
  const sum = r ? runSummary(r) : null;
  const L = layoutOf(sc);
  const f = r ? Math.min(frame, r.t.length - 1) : 0;
  const src = r ? [{ source_id: "engine run", note: `EmberAtlas ${r.provenance.engine_version}, seed ${r.provenance.seed} at t = ${sig(r.t[f], 3)} s` }, ...r.provenance.sources.slice(0, 6)] : [];
  const noThreshold = sc.detection.threshold == null && sc.detection.manual_alarm_s == null;
  const chip = "glass pointer-events-auto flex items-baseline gap-2 px-2 py-1 text-[12px] hud3d";
  const missing = missingFields(sc);
  return (
    <div className="relative h-full min-w-0" data-testid="hud3d">
      {/* top-left: time, Q, T */}
      <div className="absolute left-2 top-2 flex max-w-[60%] flex-col items-start gap-1">
        <div className={chip}>
          {compact && <span className="font-medium">{label.split(" · ")[0]}</span>}
          <span className="text-mute">t</span><span className="num" data-testid="hud-time">{r ? `${sig(S.t, 3)} s` : "—"}</span>
          <span className="text-mute">Q</span>{r ? <Num value={S.hud.Q_W! / 1e3} units="kW" title="Heat release at playhead" sources={src} /> : <span className="num">—</span>}
          <span className="text-mute">T</span>{r ? <Num value={S.hud.T_K} units="K" title="Cabin temperature at playhead" sources={src} /> : <span className="num">—</span>}
        </div>
        <div className="flex flex-wrap gap-1">
          {r && sum?.noYield && <span className="glass pointer-events-auto px-1.5 py-0.5 text-[11px] text-faint" data-testid="smoke-nodata" title="No sourced smoke yield: no smoke particles are drawn">smoke: ∅ no data</span>}
          {S.theory.spread && <a href="/methods#overview" className="glass pointer-events-auto px-1.5 py-0.5 text-[11px] text-theory">◌ theory-only</a>}
          {S.gravityMode === "partial" && <span className="glass px-1.5 py-0.5 text-[11px] text-warn" title="Partial gravity is a bounded estimate between µg and 1 g">bounded · {sig(S.gravity_g, 3)} g</span>}
          {L.detClamped && <span className="glass px-1.5 py-0.5 text-[11px] text-warn">detector beyond module end: drawn at the bulkhead</span>}
          {S.limits.map((l, i) => <span key={i} className="glass pointer-events-auto border-bad px-1.5 py-0.5 text-[11px] text-bad" data-testid="limit-chip">⚠ {l.label} · {l.source}</span>)}
        </div>
      </div>
      {/* top-right: O₂, CO, alarm */}
      <div className="absolute right-2 top-2 flex flex-col items-end gap-1">
        <div className={chip}>
          <span className="text-mute">O₂</span>{r ? <Num value={S.hud.x_o2! * 100} units="%" title="Cabin O₂ at playhead" sources={src} /> : <span className="num">{sig(sc.cabin.x_o2 * 100, 3)} %</span>}
          <span className="text-mute">CO</span>{r ? <Num value={S.hud.x_co_ppm} units="ppm" title="Cabin CO at playhead" sources={src} /> : <span className="num">—</span>}
        </div>
        <span className={`glass px-2 py-0.5 text-[12px] hud3d ${S.alarm ? "text-bad" : "text-mute"}`} data-testid="hud-alarm">
          {!r ? "detector: not run" : noThreshold ? "∅ alarm: no detector threshold" : S.alarm ? `▲ ALARM · ${sig(S.tAlarm!, 3)} s` : S.tAlarm == null ? "○ monitoring · no alarm in run" : "○ monitoring"}
        </span>
        {r && S.fanOff && <span className="glass px-2 py-0.5 text-[11px] text-mute">■ fan off</span>}
        {S.agent && <span className="glass px-2 py-0.5 text-[11px] text-blue">▨ {S.agent.kind} released</span>}
      </div>
      {/* bottom-left: honesty caption (always visible) */}
      <div className={`absolute bottom-2 left-2 ${compact ? "max-w-[46%]" : "max-w-[min(70%,calc(100%-620px))]"} min-w-[220px] space-y-0.5 text-[10.5px] leading-tight text-white/80 [text-shadow:0_1px_2px_rgb(0_0_0/0.8)]`} data-testid="scene-caption">
        <p className="hud3d">{compact ? <>Engine frame {r ? f + 1 : 0}/{r?.t.length ?? 0} · t={r ? sig(S.t, 3) : "—"}s · to scale: items, front, detector · module illustrative</> : <>Fire state: engine frame {r ? f + 1 : 0}/{r?.t.length ?? 0} · t={r ? sig(S.t, 3) : "—"}s · items, front and detector distance to scale · module illustrative</>}</p>
        {!compact && <p className="text-white/60">Module geometry illustrative · volume V = {sc.cabin.V_m3 != null ? sig(sc.cabin.V_m3, 3) : "∅"} m³ from scenario</p>}
      </div>
      {/* empty state */}
      {!r && <div className="absolute inset-x-0 top-[16%] flex justify-center" data-testid="scene-empty">
        <div className="glass pointer-events-auto px-5 py-3 text-center">
          <p className="text-[16px] font-medium">{running ? "Simulating…" : missing.length ? "Inputs needed" : "Ready · press Run (R)"}</p>
          <p className="mt-0.5 text-[12px] text-mute">{missing.length ? `Enter ${missing.join(", ")}: there is no sourced value.` : `${sc.items.length} unburnt item${sc.items.length > 1 ? "s" : ""} in the holder · ${sig(sc.cabin.x_o2 * 100, 3)}% O₂ · ${sig(sc.cabin.gravity_g, 3)} g`}</p>
        </div>
      </div>}
    </div>
  );
}
