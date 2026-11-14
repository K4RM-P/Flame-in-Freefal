"use client";
// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
import Link from "next/link";
import { useMemo, useState } from "react";
import { MISSIONS, GRAVITY_PRESETS } from "@/lib/missions";
import { lsGet, useMission } from "@/lib/store";
import { MATERIALS, MATERIAL_CLASSES, CLASS_NOTE, CLASS_LINK, materialById } from "@/lib/ui/materials";
import { gravityName, psia, sig } from "@/lib/ui/format";
import { TEST_POINTS } from "@/lib/testPoints";
import { ParamSlider, Segmented } from "@/components/ui-kit";
import { Popover } from "./Popover";

type Seg = "env" | "mat" | "cond" | "grav" | null;
const hist = (vals: number[], lo: number, hi: number, n = 24) => {
  const b = Array(n).fill(0);
  for (const v of vals) if (v >= lo && v <= hi) b[Math.min(n - 1, Math.floor(((v - lo) / (hi - lo)) * n))]++;
  return b;
};
const O2H = hist(TEST_POINTS.map((t) => t.x_o2 * 100), 10, 50);
const PH = hist(TEST_POINTS.map((t) => t.pressure_kpa), 30, 320);

export function MissionPill() {
  const s = useMission();
  const [open, setOpen] = useState<Seg>(null);
  const [cls, setCls] = useState<string>("Fabrics");
  const recent = useMemo(() => (open === "env" ? lsGet<string[]>("ea.recent", []) : []), [open]);
  const env = MISSIONS.find((m) => m.id === s.preset);
  const toggle = (k: Seg) => setOpen((o) => (o === k ? null : k));
  const seg = (k: Seg, label: string, value: string, tid: string) => (
    <button data-popover-trigger data-testid={tid} onClick={() => toggle(k)} aria-expanded={open === k}
      className={`flex min-w-0 flex-col px-3 py-1 text-left hover:bg-surface2 ${open === k ? "bg-surface2" : ""}`} style={{ borderRadius: 999 }}>
      <span className="text-[11px] font-medium text-mute">{label}</span>
      <span className="truncate text-[13px]">{value}</span>
    </button>
  );
  return (
    <div className="relative" data-testid="mission-bar">
      <div className="hidden items-center border border-line bg-bg p-0.5 md:flex" style={{ borderRadius: 999 }}>
        {seg("env", "Environment", env?.name.replace(/ \(.*\)/, "") ?? "Custom", "seg-env")}
        <span className="h-6 w-px bg-line" />
        {seg("mat", "Material", materialById(s.material).name, "seg-mat")}
        <span className="h-6 w-px bg-line" />
        {seg("cond", "Conditions", `${sig(s.x_o2 * 100)}% O₂ · ${sig(psia(s.P_kPa))} psia · ${sig(s.flow_cm_s)} cm/s`, "seg-cond")}
        <span className="h-6 w-px bg-line" />
        {seg("grav", "Gravity", gravityName(s.gravity_g), "seg-grav")}
      </div>
      <button className="btn md:hidden" data-popover-trigger onClick={() => toggle("env")}>Mission ▸</button>

      <Popover open={open === "env"} onClose={() => setOpen(null)} width={520}>
        <p className="label mb-2">Where will the crew live?</p>
        {recent.length > 0 && <p className="mb-2 text-[12px] text-mute">Recent: {recent.map((id) => <button key={id} className="mr-2 underline" onClick={() => s.applyPreset(id)}>{MISSIONS.find((m) => m.id === id)?.name ?? id}</button>)}</p>}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {MISSIONS.map((m) => (
            <button key={m.id} onClick={() => { s.applyPreset(m.id); setOpen(null); }} data-testid={`env-${m.id}`}
              className={`border p-2 text-left hover:bg-surface2 ${s.preset === m.id ? "border-ink" : "border-line"}`} style={{ borderRadius: 6 }}>
              <div className="text-[14px]">{m.name}</div>
              <div className="num text-[12px] text-mute">{Math.round(m.x_o2 * 100)}% O₂ · {sig(psia(m.P_kPa))} psia · {gravityName(m.gravity_g)}</div>
            </button>
          ))}
        </div>
        <div className="mt-3 border-t border-line pt-2 md:hidden">
          <p className="label mb-1">Material</p>
          {MATERIALS.map((m) => <button key={m.id} className="mr-2 underline" onClick={() => s.set({ material: m.id })}>{m.name}</button>)}
          <p className="label mb-1 mt-2">Gravity</p>
          <Segmented options={GRAVITY_PRESETS.map((g) => ({ v: g.g, label: g.label }))} value={s.gravity_g} onChange={(g) => s.set({ gravity_g: g })} />
        </div>
      </Popover>

      <Popover open={open === "mat"} onClose={() => setOpen(null)} width={440}>
        <div className="mb-3 flex flex-wrap gap-1">
          {MATERIAL_CLASSES.map((c) => <button key={c} onClick={() => setCls(c)} className={`chip border ${cls === c ? "border-ink text-ink" : "border-line text-mute"}`}>{c}</button>)}
        </div>
        {MATERIALS.filter((m) => m.cls === cls).map((m) => (
          <button key={m.id} data-testid={`mat-${m.id}`} onClick={() => { s.set({ material: m.id }); setOpen(null); }}
            className={`mb-1 block w-full border p-2 text-left hover:bg-surface2 ${s.material === m.id ? "border-ink" : "border-line"}`} style={{ borderRadius: 6 }}>
            <div className="text-[14px]">{m.name}</div><div className="text-[12px] text-mute">{m.detail}</div>
          </button>
        ))}
        {CLASS_NOTE[cls] && <p className="text-[13px] text-mute">{CLASS_NOTE[cls]} <Link className="underline" href={CLASS_LINK[cls]}>Open →</Link></p>}
      </Popover>

      <Popover open={open === "cond"} onClose={() => setOpen(null)} width={420}>
        <div className="space-y-3">
          <ParamSlider label="O₂ (mole %)" value={Number((s.x_o2 * 100).toFixed(1))} min={10} max={50} step={0.5} onChange={(v) => s.set({ x_o2: v / 100 })} unit="%" hist={O2H} />
          <ParamSlider label={`Pressure (kPa) · ${sig(psia(s.P_kPa))} psia`} value={s.P_kPa} min={30} max={320} step={0.1} onChange={(v) => s.set({ P_kPa: v })} unit="kPa" hist={PH} />
          <ParamSlider label="Ventilation flow" value={s.flow_cm_s} min={0} max={60} step={0.5} onChange={(v) => s.set({ flow_cm_s: v })} unit="cm/s"
            warn={s.flow_cm_s < 5 ? "below 5 cm/s BASS-II flames are flow-sensitive (quench warning)" : undefined} />
          <ParamSlider label="Free volume" value={s.V_m3} min={5} max={400} step={1} onChange={(v) => s.set({ V_m3: v })} unit="m³" />
          <p className="text-[12px] text-faint">Verified PSI tests in EmberAtlas are quiescent FLEX droplets (0 cm/s); no flow or volume histogram yet.</p>
        </div>
      </Popover>

      <Popover open={open === "grav"} onClose={() => setOpen(null)} width={320}>
        <Segmented size="md" options={GRAVITY_PRESETS.map((g) => ({ v: g.g, label: g.label }))} value={s.gravity_g} onChange={(g) => s.set({ gravity_g: g })} />
        <p className="mt-2 text-[12px] text-mute">Moon and Mars are bounded estimates from µg + 1 g data. PSI has no partial-gravity tests.</p>
      </Popover>
    </div>
  );
}
