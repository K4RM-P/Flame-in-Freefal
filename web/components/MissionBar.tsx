"use client";
import { useEffect, useRef } from "react";
import { GRAVITY_PRESETS, KPA_PER_PSI, MISSIONS } from "@/lib/missions";
import { readUrl, toUrl, useMission } from "@/lib/store";

export function MissionBar() {
  const s = useMission();
  const hydrated = useRef(false);
  useEffect(() => {
    const u = readUrl(window.location.search);
    if (Object.keys(u).length) useMission.setState(u as never);
    hydrated.current = true;
  }, []);
  useEffect(() => {
    if (!hydrated.current) return;
    const url = `${window.location.pathname}?${toUrl(s)}`;
    window.history.replaceState(null, "", url);
  }, [s]);
  const num = (k: "x_o2" | "P_kPa" | "flow_cm_s" | "V_m3", scale = 1) => ({
    value: Number((s[k] * scale).toFixed(3)),
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => { const v = Number(e.target.value) / scale; if (Number.isFinite(v)) s.set({ [k]: v }); },
  });
  return (
    <div className="sticky top-0 z-40 border-b border-line bg-bg/95 backdrop-blur" data-testid="mission-bar">
      <div className="mx-auto flex max-w-7xl flex-wrap items-end gap-x-4 gap-y-2 px-4 py-2 text-sm">
        <label className="flex flex-col"><span className="label">Mission</span>
          <select value={MISSIONS.some((m) => m.id === s.preset) ? s.preset : "Custom"} onChange={(e) => s.applyPreset(e.target.value)} data-testid="preset">
            {MISSIONS.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            <option value="Custom" disabled>Custom</option>
          </select>
        </label>
        <label className="flex flex-col"><span className="label">O₂ %</span><input type="number" step="0.5" min="5" max="100" className="w-20" {...num("x_o2", 100)} data-testid="o2" /></label>
        <label className="flex flex-col"><span className="label">Pressure kPa</span><input type="number" step="0.5" min="20" max="350" className="w-24" {...num("P_kPa")} /></label>
        <div className="flex flex-col"><span className="label">psia / pO₂</span><span className="num py-1 text-mute">{(s.P_kPa / KPA_PER_PSI).toFixed(1)} psia · {(s.x_o2 * s.P_kPa).toFixed(1)} kPa</span></div>
        <div className="flex flex-col"><span className="label">Gravity</span>
          <div className="flex overflow-hidden rounded-md border border-line">
            {GRAVITY_PRESETS.map((g) => (
              <button key={g.id} onClick={() => s.set({ gravity_g: g.g })} data-testid={`g-${g.id}`}
                className={`px-2 py-1 text-xs ${s.gravity_g === g.g ? "bg-accent text-black" : "text-mute hover:text-ink"}`}>{g.label}</button>
            ))}
          </div>
        </div>
        <label className="flex flex-col"><span className="label">Vent flow cm/s</span><input type="number" step="1" min="0" max="100" className="w-20" {...num("flow_cm_s")} /></label>
        <label className="flex flex-col"><span className="label">Free volume m³</span><input type="number" step="1" min="1" max="1000" className="w-20" {...num("V_m3")} /></label>
      </div>
    </div>
  );
}
