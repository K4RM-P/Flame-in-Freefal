"use client";
// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Simple 2D cabin schematic driven by the engine trace at the playhead: items fill with flame by burning fraction,
// the detector flashes after the alarm event, and the agent cloud appears after release.
import type { Scenario, SimResult } from "@/lib/sim/types";
import { materialByKey } from "./data";

export function Schematic({ sc, r, frame, label }: { sc: Scenario; r: SimResult | null; frame: number; label: string }) {
  const t = r?.t[frame] ?? 0;
  const happened = (k: string) => !!r?.events.some((e) => e.kind === k && e.t_s <= t);
  const alarm = happened("alarm"), agent = happened("agent_released"), fanOff = happened("fan_off");
  const W = 400, H = 150, floor = 128;
  const n = sc.items.length, slot = 300 / Math.max(n, 1);
  const maxD = Math.max(sc.detection.distance_m, 0.5);
  const detX = Math.min(W - 24, 40 + (sc.detection.distance_m / maxD) * 320);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`${label} cabin schematic at t = ${Math.round(t)} s${alarm ? ", detector in alarm" : ""}${agent ? ", agent released" : ""}`}>
      <rect x={4} y={4} width={W - 8} height={H - 8} fill="none" stroke="rgb(var(--line))" strokeWidth={1} rx={8} />
      <text x={12} y={20} fontSize={11} fill="rgb(var(--mute))">{label} · t = {Math.round(t)} s{fanOff ? " · fan off" : ""}</text>
      {/* ventilation arrows */}
      {!fanOff && sc.cabin.flow_m_s > 0 && [0, 1, 2].map((i) => <text key={i} x={14 + i * 12} y={floor - 50} fontSize={12} fill="rgb(var(--faint))">→</text>)}
      {sc.items.map((it, i) => {
        const tr = r?.items.find((x) => x.id === it.id);
        const A = it.length_m * it.width_m;
        const burning = tr ? tr.burning_area_m2[frame] ?? 0 : 0;
        const st = tr?.status[frame] ?? "idle";
        const frac = A > 0 ? Math.min(1, burning / A) : 0;
        const x = 40 + i * slot, w = Math.min(60, slot - 12), h = 70;
        return (
          <g key={it.id}>
            <rect x={x} y={floor - h} width={w} height={h} fill="rgb(var(--surface2))" stroke="rgb(var(--line))" />
            {frac > 0 && <rect x={x} y={floor - h * frac} width={w} height={h * frac} fill="rgb(var(--accent))" opacity={st === "out" ? 0.25 : 0.85} />}
            {st === "out" && <text x={x + w / 2} y={floor - h - 6} fontSize={11} textAnchor="middle" fill="rgb(var(--mute))">✕ out</text>}
            {st === "burning" && <text x={x + w / 2} y={floor - h - 6} fontSize={11} textAnchor="middle" fill="rgb(var(--ink))">● burning</text>}
            <text x={x + w / 2} y={floor + 14} fontSize={10} textAnchor="middle" fill="rgb(var(--mute))">{(materialByKey(it.material_key)?.display_name ?? it.material_key).slice(0, 14)}</text>
          </g>
        );
      })}
      <circle cx={detX} cy={18} r={7} fill={alarm ? "rgb(var(--bad))" : "rgb(var(--surface2))"} stroke="rgb(var(--mute))">
        {alarm && <animate attributeName="opacity" values="1;0.3;1" dur="0.8s" repeatCount="indefinite" />}
      </circle>
      <text x={detX} y={38} fontSize={10} textAnchor="middle" fill="rgb(var(--mute))">detector{alarm ? " ALARM" : ""}</text>
      {agent && <ellipse cx={W / 2} cy={H / 2} rx={150} ry={45} fill="rgb(var(--blue))" opacity={0.18} />}
      {agent && <text x={W - 14} y={H - 14} fontSize={10} textAnchor="end" fill="rgb(var(--blue))">{sc.suppression.agent} released</text>}
    </svg>
  );
}
