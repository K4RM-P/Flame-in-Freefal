"use client";
// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Simulation Hub viewport: a technical cabin view driven ONLY by the engine trace at the playhead.
// To scale: item length/width, flame front position, burning length (burning area ÷ width), detector distance.
// Engine-tied: smoke transport front moves at the modeled flow u (detector sees smoke after τ = d/u, as in the engine);
// cabin haze follows the detector concentration (single well-mixed zone); alarm/fan-off/agent appear only at engine events.
// Schematic (labelled): cabin walls/racks, item spacing, flame height and lean, plume rise. No value is invented.
import { useEffect, useId, useMemo, useState } from "react";
import type { Scenario, SimResult } from "@/lib/sim/types";
import { sig } from "@/lib/ui/format";
import { materialByKey } from "./data";
import { Num } from "./bits";
import { useSim, type Layer, type View } from "./store";

export function useReducedMotion() {
  const [r, setR] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    const f = () => setR(m.matches);
    f(); m.addEventListener("change", f);
    return () => m.removeEventListener("change", f);
  }, []);
  return r;
}

const VW = 1000, VH = 520;
const IX0 = 64, IX1 = 936, IY0 = 72, IY1 = 448, YC = 260;
const PAD = 70;
/** Airflow rows that avoid the racks, detector strip and the sample. */
function flowRows(half: number, yc: number) {
  const cand = [IY0 + 110, yc - half - 24, yc + half + 24, IY1 - 72];
  const out: number[] = [];
  for (const y of cand) if (y >= IY0 + 100 && y <= IY1 - 64 && out.every((o) => Math.abs(o - y) > 30)) out.push(y);
  return out;
}
const NICE = [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5];

/* One-point perspective of the module interior. The working plane (k = 1) is the IX/IY rectangle where every
   simulated object is drawn to scale; KF is the hull cut plane nearer the viewer, KB the rack wall behind. Schematic. */
const VPX = 500, KF = 1.07, KB = 0.62;
const P = (x: number, y: number, k: number) => [VPX + (x - VPX) * k, YC + (y - YC) * k] as const;
const R = (k: number) => { const [x0, y0] = P(IX0, IY0, k), [x1, y1] = P(IX1, IY1, k); return { x0, y0, x1, y1 }; };
const pts = (...p: (readonly [number, number])[]) => p.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
const FR = R(KF);
/** The cabin interior as seen through the cut plane: haze and agent fill this region. */
const INTERIOR = { x: FR.x0, y: FR.y0, w: FR.x1 - FR.x0, h: FR.y1 - FR.y0 };

function ModuleShell() {
  const F = FR, B = R(KB);
  const line = "rgb(var(--line))";
  const quad = (a: readonly [number, number], b: readonly [number, number], c: readonly [number, number], d: readonly [number, number]) => pts(a, b, c, d);
  const vent = (x: number, key: string) => {
    const k0 = 0.92, k1 = 0.72, ys = Array.from({ length: 7 }, (_, i) => YC - 48 + i * 16);
    return <g key={key}>
      <polygon points={quad(P(x, YC - 56, k0), P(x, YC - 56, k1), P(x, YC + 56, k1), P(x, YC + 56, k0))} fill="rgb(var(--bg))" stroke="rgb(var(--faint))" strokeOpacity={0.6} />
      {ys.map((y) => { const [ax, ay] = P(x, y, k0), [bx, by] = P(x, y, k1); return <line key={y} x1={ax} y1={ay} x2={bx} y2={by} stroke="rgb(var(--faint))" strokeOpacity={0.7} strokeWidth={2} />; })}
    </g>;
  };
  const racks = 5, rw = (B.x1 - B.x0) / racks;
  return (
    <g aria-hidden>
      {/* surfaces: ceiling, deck, bulkheads, rack wall (flat token fills, no gradients) */}
      <polygon points={quad([F.x0, F.y0], [F.x1, F.y0], [B.x1, B.y0], [B.x0, B.y0])} fill="rgb(var(--surface2))" fillOpacity={0.55} stroke={line} />
      <polygon points={quad([F.x0, F.y1], [F.x1, F.y1], [B.x1, B.y1], [B.x0, B.y1])} fill="rgb(var(--surface2))" fillOpacity={0.8} stroke={line} />
      <polygon points={quad([F.x0, F.y0], [B.x0, B.y0], [B.x0, B.y1], [F.x0, F.y1])} fill="rgb(var(--panel))" stroke={line} />
      <polygon points={quad([F.x1, F.y0], [B.x1, B.y0], [B.x1, B.y1], [F.x1, F.y1])} fill="rgb(var(--panel))" stroke={line} />
      <rect x={B.x0} y={B.y0} width={B.x1 - B.x0} height={B.y1 - B.y0} fill="rgb(var(--bg))" stroke={line} />
      {/* rack wall: standard-size bays with drawers and connector panels */}
      {Array.from({ length: racks }, (_, i) => {
        const x = B.x0 + i * rw + 3, w = rw - 6, h = B.y1 - B.y0 - 8, y = B.y0 + 4;
        return <g key={i}>
          <rect x={x} y={y} width={w} height={h} fill="rgb(var(--surface2))" fillOpacity={0.6} stroke={line} />
          {[0.18, 0.38, 0.58, 0.78].map((u) => <line key={u} x1={x + 6} x2={x + w - 6} y1={y + h * u} y2={y + h * u} stroke={line} />)}
          {[0.25, 0.5, 0.75].map((u) => <circle key={u} cx={x + w * u} cy={y + h * 0.9} r={2.2} fill="none" stroke="rgb(var(--faint))" strokeOpacity={0.6} />)}
        </g>;
      })}
      {/* longitudinal panel seams on ceiling and deck, converging on the vanishing point */}
      {[0.2, 0.4, 0.6, 0.8].map((u) => <g key={u}>
        <line x1={lerp(F.x0, F.x1, u)} y1={F.y0} x2={lerp(B.x0, B.x1, u)} y2={B.y0} stroke={line} />
        <line x1={lerp(F.x0, F.x1, u)} y1={F.y1} x2={lerp(B.x0, B.x1, u)} y2={B.y1} stroke={line} />
      </g>)}
      {/* ring frames (stations) */}
      {[0.93, 0.8, 0.7].map((k) => { const r = R(k); return <rect key={k} x={r.x0} y={r.y0} width={r.x1 - r.x0} height={r.y1 - r.y0} fill="none" stroke={line} strokeWidth={k > 0.9 ? 2 : 1} />; })}
      {/* ceiling light panels */}
      {[[0.93, 0.8], [0.8, 0.7]].map(([k0, k1]) => <polygon key={k0} points={quad(P(VPX - 90, IY0, k0), P(VPX + 90, IY0, k0), P(VPX + 90, IY0, k1), P(VPX - 90, IY0, k1))} fill="rgb(var(--ink))" fillOpacity={0.06} stroke={line} />)}
      {/* bulkhead vents: return (left), supply (right) */}
      {vent(IX0, "ret")}{vent(IX1, "sup")}
      {(() => { const [x, y] = P(IX0, YC - 64, 0.82); return <text x={x + 4} y={y} fontSize={11} fill="rgb(var(--faint))">return</text>; })()}
      {(() => { const [x, y] = P(IX1, YC - 64, 0.82); return <text x={x - 4} y={y} fontSize={11} textAnchor="end" fill="rgb(var(--faint))">supply</text>; })()}
      {/* hull cut plane: wall section with insulation hatch */}
      <path d={`M12 34 H988 V486 H12 Z M${F.x0} ${F.y0} V${F.y1} H${F.x1} V${F.y0} Z`} fillRule="evenodd" fill="rgb(var(--panel))" stroke={line} strokeWidth={2} />
      <path d={`M12 34 H988 V486 H12 Z M${F.x0} ${F.y0} V${F.y1} H${F.x1} V${F.y0} Z`} fillRule="evenodd" fill="url(#hatch-char)" opacity={0.35} />
      <rect x={F.x0} y={F.y0} width={F.x1 - F.x0} height={F.y1 - F.y0} fill="none" stroke="rgb(var(--faint))" strokeOpacity={0.6} />
    </g>
  );
}

/** Run-level facts the view needs (max values for relative shading; event times). */
export function runFacts(sc: Scenario, r: SimResult | null) {
  if (!r) return null;
  const Qmax = Math.max(0, ...r.state.map((s) => s.Q_W));
  const smokeMax = Math.max(0, ...r.state.map((s) => s.smoke_det));
  const ev = (k: string) => r.events.find((e) => e.kind === k)?.t_s ?? null;
  const noYield = r.warnings.some((w) => /no sourced smoke yield/i.test(w));
  const tIgn: Record<string, number | null> = {};
  for (const tr of r.items) { const i = tr.status.findIndex((s) => s !== "idle"); tIgn[tr.id] = i >= 0 ? r.t[i] : null; }
  return { Qmax, smokeMax, tAlarm: ev("alarm"), tFanOff: ev("fan_off"), tAgent: ev("agent_released"), noYield, tIgn,
    smokeTheory: r.provenance.params.smoke ? !r.provenance.params.smoke.calibrated : false,
    spreadTheory: r.provenance.params.spread ? !r.provenance.params.spread.calibrated : false,
    habitatTheory: r.provenance.params.habitat ? !r.provenance.params.habitat.calibrated : false,
    engine: `EmberAtlas ${r.provenance.engine_version}, seed ${r.provenance.seed}` };
}

export function CabinView({ sc, r, frame, label, compact = false }: { sc: Scenario; r: SimResult | null; frame: number; label: string; compact?: boolean }) {
  const { view, layers } = useSim();
  const clipId = useId().replace(/:/g, "");
  const reduced = useReducedMotion();
  const F = useMemo(() => runFacts(sc, r), [sc, r]);
  const f = r ? Math.min(frame, r.t.length - 1) : 0;
  const t = r?.t[f] ?? 0;
  const st = r?.state[f];
  const on = (k: Layer) => layers[k];

  // horizontal layout in metres → px (to scale); item spacing is schematic (the engine has no item positions)
  const d = sc.detection.distance_m;
  const Ls = sc.items.map((i) => i.length_m);
  const gap = 0.15 * Math.max(...Ls);
  const span = d + Ls.reduce((a, b) => a + b, 0) + gap * (sc.items.length - 1);
  const maxW = Math.max(...sc.items.map((i) => i.width_m));
  const s = Math.min((IX1 - IX0 - 2 * PAD) / span, (view === "elevation" ? 230 : 160) / Math.max(maxW, 1e-3));
  const x0 = IX0 + PAD + ((IX1 - IX0 - 2 * PAD) - span * s) / 2;
  const detX = x0;
  let cursor = x0 + d * s;
  const itemX = sc.items.map((it) => { const x = cursor; cursor += it.length_m * s + gap * s; return x; });
  const sheetY = view === "section" ? YC + 90 : YC;

  const alarmed = F?.tAlarm != null && t >= F.tAlarm;
  const fanOff = F?.tFanOff != null && t >= F.tFanOff;
  const released = F?.tAgent != null && t >= F.tAgent;
  const u = fanOff ? 0 : sc.cabin.flow_m_s;
  const g = sc.cabin.gravity_g;
  const Qrel = F && F.Qmax > 0 && st ? st.Q_W / F.Qmax : 0;
  const hazeRel = F && F.smokeMax > 0 && st ? st.smoke_det / F.smokeMax : 0;
  // flame brightness/size follows the engine's current O₂ relative to the initial cabin O₂ (schematic scaling, engine-tied input)
  const o2r = st && sc.cabin.x_o2 > 0 ? Math.max(0, Math.min(1.2, st.x_o2 / sc.cabin.x_o2)) : 1;
  const sensed = !!st && st.smoke_det > 0 && !F?.noYield;
  const noThreshold = sc.detection.threshold == null && sc.detection.manual_alarm_s == null;
  const tau = sc.cabin.flow_m_s > 0 ? d / sc.cabin.flow_m_s : null;

  // per-item flame geometry from the trace
  const items = sc.items.map((it, i) => {
    const tr = r?.items.find((x) => x.id === it.id);
    const front = tr?.front_m[f] ?? 0;
    const area = tr?.burning_area_m2[f] ?? 0;
    const status = tr?.status[f] ?? "idle";
    const burnLen = Math.min(front, it.width_m > 0 ? area / it.width_m : 0);
    const x = itemX[i];
    const fx1 = x + front * s, fx0 = Math.min(fx1 - (status === "burning" ? 2 : 0), x + (front - burnLen) * s);
    return { it, tr, front, area, status, burnLen, x, fx0, fx1, w: it.length_m * s, h: it.width_m * s, name: materialByKey(it.material_key)?.display_name ?? it.material_key,
      tIgn: F?.tIgn[it.id] ?? null, reason: tr?.extinguish_reason };
  });

  const scaleLen = NICE.find((n) => n * s >= 60) ?? NICE[NICE.length - 1];
  const summary = `${label} at t = ${sig(t, 3)} s: ${items.map((x) => `${x.name} ${x.status}`).join(", ")}; detector ${alarmed ? "in alarm" : noThreshold ? "no threshold (no data)" : "monitoring"}${fanOff ? "; fan off" : ""}${released ? `; ${sc.suppression.agent} released` : ""}`;

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden" data-testid="cabin-view">
      <Hud sc={sc} r={r} f={f} F={F} compact={compact} fanOff={fanOff} u={u} />
      <svg viewBox={`0 0 ${VW} ${VH}`} preserveAspectRatio="xMidYMid meet" className="min-h-0 w-full flex-1" role="img" aria-label={summary}>
        <defs>
          <pattern id="hatch-agent" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="8" stroke="rgb(var(--blue))" strokeWidth="2" /></pattern>
          <pattern id="hatch-char" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)"><line x1="0" y1="0" x2="0" y2="5" stroke="rgb(var(--faint))" strokeWidth="1.2" /></pattern>
          <filter id="smoke-soft" x="-35%" y="-35%" width="170%" height="170%"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="3" seed="7" result="noise" /><feDisplacementMap in="SourceGraphic" in2="noise" scale="11" /><feGaussianBlur stdDeviation="2.2" /></filter>
          <filter id="flame-glow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="5" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          <marker id="arrow" viewBox="0 0 10 10" refX="2" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M10 0 L0 5 L10 10 z" fill="rgb(var(--blue))" /></marker>
        </defs>

        {/* 1 · cabin geometry: schematic module interior in one-point perspective (hull cutaway, rack wall, ceiling, deck, bulkheads) */}
        {on("geometry") ? <ModuleShell /> : <rect x={IX0} y={IY0} width={IX1 - IX0} height={IY1 - IY0} fill="none" stroke="rgb(var(--line))" strokeDasharray="4 6" aria-hidden />}
        <g aria-hidden>
          <text x={34} y={22} fontSize={12} fill="rgb(var(--mute))">{label} · {view === "elevation" ? "elevation (sample face)" : "section (sample edge-on)"} · t = {sig(t, 3)} s</text>
          {g > 0 && view === "section" && <g><line x1={VW - 48} x2={VW - 48} y1={52} y2={92} stroke="rgb(var(--faint))" markerEnd="url(#arrow)" /><text x={VW - 54} y={106} fontSize={10} textAnchor="middle" fill="rgb(var(--faint))">g {sig(g, 3)}</text></g>}
        </g>

        {/* 2 · smoke: cabin haze (well-mixed, follows detector concentration) and transport plume (moves at u) */}
        {on("smoke") && F && !F.noYield && <>
          <rect x={INTERIOR.x} y={INTERIOR.y} width={INTERIOR.w} height={INTERIOR.h} fill="rgb(var(--mute))" opacity={0.32 * hazeRel} filter="url(#smoke-soft)" />
          {items.map((x) => {
            if (x.tIgn == null || t < x.tIgn) return null;
            const tEff = Math.min(t, F.tFanOff ?? t) - x.tIgn;
            const travelled = Math.max(0, sc.cabin.flow_m_s * tEff) * s;
            const sx = (x.fx0 + x.fx1) / 2;
            const Lp = Math.min(sx - (IX0 + 8), travelled);
            const sp = 22, phase = reduced ? 0 : (sc.cabin.flow_m_s * tEff * s) % sp;
            const n = Math.max(0, Math.floor(Lp / sp));
            const yBase = view === "section" ? sheetY - 30 : sheetY;
            return <g key={x.it.id} aria-hidden filter="url(#smoke-soft)">
              {Array.from({ length: n + 1 }, (_, k) => {
                const dx = k * sp + phase; if (dx > Lp) return null;
                const age = Lp > 0 ? dx / Lp : 0;
                const rise = view === "section" && g > 0 ? Math.min(dx * 0.35 * Math.sqrt(g), 140) : 0;
                const jit = Math.sin(k * 1.7) * (view === "elevation" ? x.h * 0.25 : 10);
                return <circle key={k} cx={sx - dx} cy={yBase - rise + jit} r={5 + age * 12} fill="rgb(var(--mute))" opacity={0.18 + 0.4 * Qrel}
                  stroke={F.smokeTheory ? "rgb(var(--theory))" : "none"} strokeDasharray={F.smokeTheory ? "2 3" : undefined} />;
              })}
              {Lp > 4 && <line x1={sx - Lp} x2={sx - Lp} y1={yBase - 40} y2={yBase + 40} stroke="rgb(var(--mute))" strokeDasharray="3 3" />}
            </g>;
          })}
        </>}

        {/* 3 · airflow vectors: direction per the engine's opposed-flow model (toward the return, away from spread) */}
        {on("airflow") && u > 0 && <g aria-hidden opacity={0.55}>
          {flowRows(view === "elevation" ? maxW * s / 2 : 40, sheetY).map((y, row) => Array.from({ length: 12 }, (_, k) => {
            const sp = 72, off = reduced ? 0 : (u * t * s) % sp;
            const x = IX1 - 30 - k * sp - off;
            if (x < IX0 + 40) return null;
            return <line key={`${row}-${k}`} x1={x} x2={x - 26} y1={y} y2={y} stroke="rgb(var(--blue))" strokeWidth={1.5} markerEnd="url(#arrow)" />;
          }))}
        </g>}

        {/* 4 · material samples, char, flame front and heat region */}
        {items.map((x) => {
          const top = view === "elevation" ? sheetY - x.h / 2 : sheetY - Math.max(3, x.it.thickness_m * s) / 2;
          const hh = view === "elevation" ? x.h : Math.max(3, x.it.thickness_m * s);
          const burning = x.status === "burning";
          const hf = Math.max(6, Math.min(130, (x.fx1 - x.fx0) * 0.6 + 40 * Qrel)) * (g > 0 ? 1 + 1.2 * Math.sqrt(g) : 0.75);
          const lean = Math.min(1.2, u / 0.1) * hf * 0.5;
          const op = (0.35 + 0.55 * Qrel) * o2r;
          const dash = F?.spreadTheory ? "4 3" : undefined;
          return <g key={x.it.id}>
            <rect x={x.x} y={top} width={x.w} height={hh} fill="rgb(var(--surface2))" stroke="rgb(var(--ink))" strokeOpacity={0.5} />
            {x.front > 0 && <rect x={x.x} y={top} width={Math.max(0, x.fx0 - x.x)} height={hh} fill="url(#hatch-char)" />}
            {on("heat") && burning && <ellipse cx={(x.fx0 + x.fx1) / 2} cy={view === "elevation" ? sheetY : sheetY - hf / 2} rx={(x.fx1 - x.fx0) / 2 + 14 + 50 * Math.sqrt(Qrel)} ry={(view === "elevation" ? x.h / 2 : hf / 2) + 10 + 30 * Math.sqrt(Qrel)}
              fill="rgb(var(--warn))" fillOpacity={0.07} stroke="rgb(var(--warn))" strokeOpacity={0.6} strokeDasharray="4 4" />}
            {on("heat") && burning && (view === "elevation"
              ? <g>
                  {/* flame envelope on the face: pinned at the pyrolysis front, trailing downstream with the flow (lean ∝ u), scaled by Q and O₂ */}
                  <path filter="url(#flame-glow)" d={`M${x.fx1} ${top} C${x.fx0} ${top - 4 * o2r} ${x.fx0 - lean} ${top + hh * 0.2} ${x.fx0 - lean * 1.2} ${sheetY} C${x.fx0 - lean} ${top + hh * 0.8} ${x.fx0} ${top + hh + 4 * o2r} ${x.fx1} ${top + hh} Z`}
                    fill="rgb(var(--accent))" fillOpacity={op * 0.35} stroke="rgb(var(--accent))" strokeOpacity={0.8} strokeDasharray={dash} />
                  <rect x={x.fx0} y={top} width={Math.max(2, x.fx1 - x.fx0)} height={hh} fill="rgb(var(--accent))" opacity={op} />
                </g>
              : [-1, 1].map((side) => {
                  const base = side < 0 ? top : top + hh, hs = side < 0 ? hf : hf * (g > 0 ? 0.35 : 1);
                  return <path key={side} filter="url(#flame-glow)" d={`M${x.fx0} ${base} Q${(x.fx0 + x.fx1) / 2 - lean} ${base + side * hs * 1.3} ${x.fx1} ${base} Z`} fill="rgb(var(--accent))" opacity={op} stroke="rgb(var(--accent))" strokeDasharray={dash} />;
                }))}
            {burning && <line x1={x.fx1} x2={x.fx1} y1={top - 6} y2={top + hh + 6} stroke="rgb(var(--accent))" strokeWidth={2} />}
            <text x={x.x + x.w / 2} y={top - (view === "section" && burning ? hf + 14 : 10)} fontSize={12} textAnchor="middle" fill={burning ? "rgb(var(--ink))" : "rgb(var(--mute))"}>
              {burning ? "● burning" : x.status === "out" ? `✕ extinct${x.reason ? ` · ${x.reason}` : ""}` : "○ not ignited"}</text>
            <text x={x.x + x.w / 2} y={top + hh + 18} fontSize={11} textAnchor="middle" fill="rgb(var(--mute))">{x.name} · {sig(x.it.length_m * 100, 3)} × {sig(x.it.width_m * 100, 3)} cm</text>
          </g>;
        })}

        {/* 5 · detector: transport distance (input) and state (only from engine events) */}
        {on("detector") && <g>
          {/* sensing envelope: the engine's only detector geometry is the transport distance d (no sensing radius is modeled).
              Dashed = no smoke at the detector yet; solid = engine reports smoke at the detector; red ▲ only on the alarm event. */}
          <clipPath id={`clip-${clipId}`}><rect x={IX0} y={IY0} width={IX1 - IX0} height={IY1 - IY0} /></clipPath>
          <circle cx={detX} cy={IY0 + 58} r={d * s} clipPath={`url(#clip-${clipId})`} fill={alarmed ? "rgb(var(--bad))" : "none"} fillOpacity={0.06}
            stroke={alarmed ? "rgb(var(--bad))" : sensed ? "rgb(var(--ink))" : "rgb(var(--faint))"} strokeOpacity={0.7} strokeDasharray={sensed || alarmed ? undefined : "5 5"} />
          <line x1={detX} x2={detX} y1={IY0} y2={IY0 + 49} stroke="rgb(var(--faint))" strokeWidth={2} />
          <line x1={detX} x2={x0 + d * s} y1={IY1 - 46} y2={IY1 - 46} stroke="rgb(var(--faint))" />
          {[detX, x0 + d * s].map((xx) => <line key={xx} x1={xx} x2={xx} y1={IY1 - 52} y2={IY1 - 40} stroke="rgb(var(--faint))" />)}
          <text x={(detX + x0 + d * s) / 2} y={IY1 - 52} fontSize={11} textAnchor="middle" fill="rgb(var(--mute))">d = {sig(d, 3)} m{tau != null ? ` · τ = d/u = ${sig(tau, 3)} s` : " · u = 0: no transport"}</text>
          <g transform={`translate(${detX},${IY0 + 58})`}>
            <rect x={-16} y={-9} width={32} height={18} rx={4} fill={alarmed ? "rgb(var(--bad))" : "rgb(var(--surface2))"} stroke={noThreshold ? "rgb(var(--faint))" : "rgb(var(--ink))"} strokeDasharray={noThreshold ? "3 3" : undefined} />
            <text y={4} fontSize={11} textAnchor="middle" fill={alarmed ? "rgb(var(--bg))" : "rgb(var(--ink))"}>{alarmed ? "▲" : noThreshold ? "∅" : "○"}</text>
            <text y={26} fontSize={11} textAnchor="middle" fill={alarmed ? "rgb(var(--bad))" : "rgb(var(--mute))"}>
              {alarmed ? `ALARM · ${sig(F!.tAlarm!, 3)} s` : noThreshold ? "No data: no threshold" : `${sc.detection.type} · monitoring`}</text>
            <text y={40} fontSize={10} textAnchor="middle" fill="rgb(var(--faint))">{!r ? "" : F?.noYield ? "smoke: ∅ No data" : sensed ? "smoke at detector" : "no smoke at detector"}</text>
          </g>
        </g>}

        {/* 6 · suppression: armed nozzle; cloud only after the engine's agent_released event (instant, well-mixed) */}
        {on("suppression") && sc.suppression.agent !== "none" && <g>
          {released && <rect x={INTERIOR.x} y={INTERIOR.y} width={INTERIOR.w} height={INTERIOR.h} fill="url(#hatch-agent)" opacity={0.22} />}
          <g transform={`translate(${IX1 - 70},${IY0 + 44})`}>
            <path d="M-8 -8 h16 v8 l-4 8 h-8 l-4 -8 z" fill={released ? "rgb(var(--blue))" : "rgb(var(--surface2))"} stroke="rgb(var(--blue))" />
            <text y={26} fontSize={11} textAnchor="middle" fill="rgb(var(--blue))">{sc.suppression.agent.replace("2", "₂")} {released ? `released · ${sig(F!.tAgent!, 3)} s` : sc.suppression.mass_kg > 0 ? "armed" : "0 kg: inactive"}</text>
          </g>
        </g>}

        {/* scale bar + honesty note */}
        <g aria-hidden>
          <line x1={IX1 - 20 - scaleLen * s} x2={IX1 - 20} y1={VH - 14} y2={VH - 14} stroke="rgb(var(--ink))" strokeWidth={2} />
          <text x={IX1 - 20 - scaleLen * s / 2} y={VH - 20} fontSize={11} textAnchor="middle" fill="rgb(var(--ink))">{scaleLen >= 1 ? `${scaleLen} m` : `${sig(scaleLen * 100, 2)} cm`}</text>
          {!compact && <text x={34} y={VH - 10} fontSize={10} fill="rgb(var(--faint))">Lengths, front, burning length and detector distance to scale · walls, spacing, flame height/lean and plume rise schematic · single well-mixed zone{sc.cabin.V_m3 != null ? ` (V = ${sig(sc.cabin.V_m3, 3)} m³)` : ""}</text>}
        </g>
      </svg>
    </div>
  );
}

function Hud({ sc, r, f, F, compact, fanOff, u }: { sc: Scenario; r: SimResult | null; f: number; F: ReturnType<typeof runFacts>; compact: boolean; fanOff: boolean; u: number }) {
  if (!r || !F) return <div className="border-b border-line px-3 py-1 text-[12px] text-mute" data-testid="hud">Not run yet · inputs shown to scale</div>;
  const st = r.state[f];
  const band = (k: string, conv = (v: number) => v) => { const b = r.bands?.[k]; return b ? { p05: conv(b.p05[f]), p50: conv(b.p50[f]), p95: conv(b.p95[f]) } : undefined; };
  const src = [{ source_id: "engine run", note: `${F.engine} at t = ${sig(r.t[f], 3)} s` }, ...r.provenance.sources.slice(0, 6)];
  const cell = "flex items-baseline gap-1.5 whitespace-nowrap";
  return (
    <div className={`flex flex-wrap items-baseline gap-x-4 gap-y-0.5 border-b border-line px-3 py-1 ${compact ? "text-[11px]" : "text-[12px]"}`} data-testid="hud">
      <div className={cell}><span className="text-mute">Q</span><Num value={st.Q_W / 1e3} units="kW" band={compact ? undefined : band("Q_W", (v) => v / 1e3)} title="Heat release at playhead" sources={src} /></div>
      <div className={cell}><span className="text-mute">Burning</span><Num value={st.burning_area_m2 * 1e4} units="cm²" band={compact ? undefined : band("burning_area_m2", (v) => v * 1e4)} title="Burning area at playhead" sources={src} /></div>
      <div className={cell}><span className="text-mute">T{F.habitatTheory && <span className="text-theory" title="theory-only"> ◌</span>}</span><Num value={st.T_K} units="K" band={compact ? undefined : band("T_K")} title="Cabin temperature at playhead" sources={src} note={F.habitatTheory ? "habitat sub-model is theory-only (not calibrated on PSI data)" : undefined} /></div>
      <div className={cell}><span className="text-mute">O₂</span><Num value={st.x_o2 * 100} units="% mol" band={compact ? undefined : band("x_o2", (v) => v * 100)} title="Cabin O₂ at playhead" sources={src} /></div>
      <div className={cell}><span className="text-mute">Smoke @ det.{F.smokeTheory && <span className="text-theory" title="theory-only"> ◌</span>}</span>
        {F.noYield ? <span className="text-faint" title="No sourced smoke yield for a burning material">∅ No data</span>
          : <Num value={st.smoke_det * 1e6} units="mg/m³" band={compact ? undefined : band("smoke_det", (v) => v * 1e6)} title="Smoke at the detector at playhead" sources={src} note={F.smokeTheory ? "smoke sub-model is theory-only" : undefined} />}</div>
      <div className={cell}><span className="text-mute">u</span><span className="num">{fanOff ? "0 (fan off)" : `${sig(u * 100, 3)} cm/s`}</span></div>
    </div>
  );
}

export function Legend() {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-mute" data-testid="legend">
      <span><span className="text-accent">●</span> burning (flame zone)</span>
      <span><span className="text-bad">▲</span> alarm (engine event)</span>
      <span>✕ extinct · ○ not ignited</span>
      <span className="text-theory">◌ theory-only (dashed)</span>
      <span>∅ no data</span>
      <span><span className="text-blue">→</span> airflow (u)</span>
      <span>◍ smoke (moves at u)</span>
      <span><span className="text-blue">▨</span> agent (well-mixed)</span>
      <span><span className="text-warn">┄</span> heat region (relative Q)</span>
      <span>▤ charred (burnt length)</span>
      <span>◯ detector envelope (d; solid = smoke sensed)</span>
    </div>
  );
}
