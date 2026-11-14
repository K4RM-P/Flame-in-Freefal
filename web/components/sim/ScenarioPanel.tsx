"use client";
// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// LEFT column: plain-English builder, presets, and the scenario fields (units shown; SI inside).
import { useState } from "react";
import { PRESETS } from "@/lib/sim/presets";
import { GRAVITY, ScenarioSchema, type Item, type Provenance, type Scenario } from "@/lib/sim/types";
import { Segmented } from "@/components/ui-kit";
import { MATERIALS, canIgnite, depthLine, materialByKey } from "./data";
import { NumField, Section, BoundedBadge } from "./bits";
import { useSim } from "./store";

type Preset = (typeof PRESETS)[number];
export const presetTestId = (id: string) => (/saffire/i.test(id) ? "preset-saffire" : /iss|compare|vs/i.test(id) ? "preset-iss-lunar" : `preset-${id}`);
export const isReplayPreset = (id: string | null) => !!id && /saffire/i.test(id);

export function applyPreset(p: Preset) {
  const built = p.build() as Scenario | { a: Scenario; b: Scenario };
  const pair = "a" in built && "b" in built;
  useSim.getState().set({
    a: pair ? (built as { a: Scenario }).a : (built as Scenario), b: pair ? (built as { b: Scenario }).b : null,
    editing: "a", presetId: p.id, replay: isReplayPreset(p.id), ra: null, rb: null, frame: 0, interp: { state: "idle" }, runError: null,
  });
}

/** Hover text for a field: the preset's provenance for that path, else "User input". */
function sourceOf(presetId: string | null, path: string): string {
  const p = PRESETS.find((q: Preset) => q.id === presetId) as (Preset & { provenance?: unknown }) | undefined;
  const prov = p?.provenance as Record<string, Provenance | string> | Provenance[] | undefined;
  if (!prov) return "User input";
  if (Array.isArray(prov)) {
    const hit = prov.find((x) => x.note?.includes(path) || x.locator?.includes(path));
    return hit ? fmtProv(hit) : prov.map(fmtProv).join("; ");
  }
  const v = prov[path];
  return v ? (typeof v === "string" ? v : fmtProv(v)) : "User input";
}
export const fmtProv = (p: Provenance) => [p.source_id, p.locator, p.doi && `doi:${p.doi}`, p.note].filter(Boolean).join(" · ");

const G_OPTS = [{ v: GRAVITY.ug, label: "µg" }, { v: GRAVITY.moon, label: "Moon" }, { v: GRAVITY.mars, label: "Mars" }, { v: GRAVITY.earth, label: "1 g" }];

export function ScenarioPanel() {
  const { a, b, editing, presetId, set, patch } = useSim();
  const sc = editing === "b" && b ? b : a;
  if (!sc) return <div className="text-mute">Loading presets…</div>;
  const src = (path: string) => sourceOf(presetId, path);
  const c = sc.cabin;
  const partial = c.gravity_g > 0 && c.gravity_g < 1;
  const ignitable = sc.items.filter((i) => canIgnite(materialByKey(i.material_key)));

  return (
    <div className="space-y-1">
      <Describe />
      <Section title="Presets">
        <div className="flex flex-col gap-1.5">
          {PRESETS.map((p: Preset) => (
            <button key={p.id} type="button" className={`btn justify-start text-left ${presetId === p.id ? "bg-surface2" : ""}`} data-testid={presetTestId(p.id)}
              title={p.description} onClick={() => applyPreset(p)}>{p.label}</button>
          ))}
        </div>
      </Section>
      {b && (
        <div className="flex items-center gap-2 py-2 text-[13px]">
          <span className="text-mute">Editing</span>
          <Segmented options={[{ v: "a" as const, label: `A · ${a?.name ?? ""}` }, { v: "b" as const, label: `B · ${b.name}` }]} value={editing} onChange={(v) => set({ editing: v })} />
        </div>
      )}
      <Section title="Cabin">
        <label className="grid grid-cols-[1fr_auto] items-center gap-2 text-[13px]"><span className="text-mute">Name</span>
          <input type="text" className="w-40" value={sc.name} onChange={(e) => patch((s) => ({ ...s, name: e.target.value }))} /></label>
        <NumField label="Oxygen" units="% mol" value={round(c.x_o2 * 100)} source={src("cabin.x_o2")} step={0.1} min={0} max={100}
          onChange={(v) => v != null && patch((s) => ({ ...s, cabin: { ...s.cabin, x_o2: v / 100 } }))} />
        <NumField label="Pressure" units="kPa" value={round(c.P_Pa / 1e3)} source={src("cabin.P_Pa")} step={0.1} min={1}
          onChange={(v) => v != null && patch((s) => ({ ...s, cabin: { ...s.cabin, P_Pa: v * 1e3 } }))} />
        <div className="flex items-center justify-between gap-2 text-[13px]" title={src("cabin.gravity_g")}>
          <span className="text-mute">Gravity</span>
          <Segmented options={G_OPTS} value={c.gravity_g} onChange={(v) => patch((s) => ({ ...s, cabin: { ...s.cabin, gravity_g: v } }))} testid="gravity" />
        </div>
        {partial && <BoundedBadge />}
        <NumField label="Free volume" units="m³" value={c.V_m3} source={src("cabin.V_m3")} required min={0.01}
          onChange={(v) => patch((s) => ({ ...s, cabin: { ...s.cabin, V_m3: v != null && v > 0 ? v : null } }))} testid="volume" />
        <NumField label="Ventilation past items" units="cm/s" value={round(c.flow_m_s * 100)} source={src("cabin.flow_m_s")} step={0.5} min={0}
          onChange={(v) => v != null && patch((s) => ({ ...s, cabin: { ...s.cabin, flow_m_s: v / 100 } }))} />
        <label className="flex items-center justify-between text-[13px]" title={src("cabin.fan_off_on_alarm")}>
          <span className="text-mute">Fan off on alarm</span>
          <input type="checkbox" checked={c.fan_off_on_alarm} onChange={(e) => patch((s) => ({ ...s, cabin: { ...s.cabin, fan_off_on_alarm: e.target.checked } }))} />
        </label>
      </Section>
      <Section title={`Materials (${sc.items.length})`} right={<AddMaterial />}>
        {sc.items.map((it, idx) => <ItemRow key={it.id} it={it} idx={idx} src={src} />)}
      </Section>
      <Section title="Fire">
        {ignitable.length === 0 ? <p className="text-[13px] text-warn">No item has PSI burn data, so nothing can ignite. Add a material with ISS burn tests.</p> : (
          <>
            <label className="grid grid-cols-[1fr_auto] items-center gap-2 text-[13px]"><span className="text-mute">Ignition item</span>
              <select value={sc.items.find((i) => i.ignite)?.id ?? ""} onChange={(e) => patch((s) => ({ ...s, items: s.items.map((i) => ({ ...i, ignite: i.id === e.target.value })) }))}>
                <option value="">— none —</option>
                {ignitable.map((i) => <option key={i.id} value={i.id}>{materialByKey(i.material_key)?.display_name ?? i.material_key} ({i.id})</option>)}
              </select></label>
            <NumField label="Ignition time" units="s" value={sc.items.find((i) => i.ignite)?.t_ignite_s ?? 0} min={0} max={600} source={src("items.t_ignite_s")}
              onChange={(v) => v != null && patch((s) => ({ ...s, items: s.items.map((i) => (i.ignite ? { ...i, t_ignite_s: v } : i)) }))} />
          </>
        )}
      </Section>
      <Section title="Detection">
        <label className="grid grid-cols-[1fr_auto] items-center gap-2 text-[13px]" title={src("detection.type")}><span className="text-mute">Detector type</span>
          <select value={sc.detection.type} onChange={(e) => patch((s) => ({ ...s, detection: { ...s.detection, type: e.target.value as Scenario["detection"]["type"] } }))}>
            <option value="photoelectric">Photoelectric</option><option value="ionization">Ionization</option>
          </select></label>
        <NumField label="Distance from fire" units="m" value={sc.detection.distance_m} min={0.01} source={src("detection.distance_m")}
          onChange={(v) => v != null && v > 0 && patch((s) => ({ ...s, detection: { ...s.detection, distance_m: v } }))} />
        <NumField label="Alarm threshold (smoke)" units="mg/m³" value={sc.detection.threshold == null ? null : round(sc.detection.threshold * 1e6)} min={0}
          source={src("detection.threshold")}
          onChange={(v) => patch((s) => ({ ...s, detection: { ...s.detection, threshold: v != null && v > 0 ? v / 1e6 : null } }))} />
      </Section>
      <Section title="Suppression">
        <div className="flex items-center justify-between text-[13px]" title={src("suppression.agent")}><span className="text-mute">Agent</span>
          <Segmented options={[{ v: "none" as const, label: "None" }, { v: "CO2" as const, label: "CO₂" }, { v: "N2" as const, label: "N₂" }]} value={sc.suppression.agent}
            onChange={(v) => patch((s) => ({ ...s, suppression: { ...s.suppression, agent: v } }))} /></div>
        {sc.suppression.agent !== "none" && <>
          <NumField label="Delay after alarm" units="s" value={sc.suppression.delay_s} min={0} source={src("suppression.delay_s")}
            onChange={(v) => v != null && patch((s) => ({ ...s, suppression: { ...s.suppression, delay_s: v } }))} />
          <NumField label="Agent mass" units="kg" value={sc.suppression.mass_kg} min={0} source={src("suppression.mass_kg")}
            onChange={(v) => v != null && patch((s) => ({ ...s, suppression: { ...s.suppression, mass_kg: v } }))} />
        </>}
      </Section>
    </div>
  );
}

const round = (x: number) => Math.round(x * 1e4) / 1e4;

function ItemRow({ it, idx, src }: { it: Item; idx: number; src: (p: string) => string }) {
  const patch = useSim((s) => s.patch);
  const m = materialByKey(it.material_key);
  const up = (f: Partial<Item>) => patch((s) => ({ ...s, items: s.items.map((i) => (i.id === it.id ? { ...i, ...f } : i)) }));
  return (
    <div className="border border-line p-2" style={{ borderRadius: 6 }}>
      <div className="flex items-start justify-between gap-2">
        <div className="text-[13px]">
          <p className="font-medium">{m?.display_name ?? it.material_key} <span className="num text-[12px] text-faint">{it.id}</span></p>
          {m ? <p className="text-[12px] text-mute">{depthLine(m)}{!canIgnite(m) && " · smoke source only"}</p> : <p className="text-[12px] text-warn">Not in the PSI material library</p>}
        </div>
        <button type="button" className="text-[12px] text-faint hover:text-ink" aria-label={`Remove ${it.id}`}
          onClick={() => patch((s) => (s.items.length > 1 ? { ...s, items: s.items.filter((i) => i.id !== it.id) } : s))}>✕</button>
      </div>
      {m && m.thicknesses_m.length > 0 ? (
        <label className="grid grid-cols-[1fr_auto] items-center gap-2 text-[13px]" title={src(`items.${idx}.thickness_m`)}><span className="text-mute">Thickness (tested)</span>
          <select className="num" value={it.thickness_m} onChange={(e) => up({ thickness_m: Number(e.target.value) })}>
            {[...new Set([...m.thicknesses_m, it.thickness_m])].sort((x, y) => x - y).map((t) => <option key={t} value={t}>{round(t * 1e3)} mm{m.thicknesses_m.includes(t) ? "" : " (untested)"}</option>)}
          </select></label>
      ) : <NumField label="Thickness" units="mm" value={round(it.thickness_m * 1e3)} onChange={(v) => v != null && v > 0 && up({ thickness_m: v / 1e3 })} />}
      <NumField label="Length" units="cm" value={round(it.length_m * 100)} source={src(`items.${idx}.length_m`)} onChange={(v) => v != null && v > 0 && up({ length_m: v / 100 })} />
      <NumField label="Width" units="cm" value={round(it.width_m * 100)} source={src(`items.${idx}.width_m`)} onChange={(v) => v != null && v > 0 && up({ width_m: v / 100 })} />
    </div>
  );
}

function AddMaterial() {
  const patch = useSim((s) => s.patch);
  return (
    <select aria-label="Add material" className="min-w-0 max-w-full text-[12px]" value="" onChange={(e) => {
      const m = materialByKey(e.target.value);
      if (!m) return;
      patch((s) => {
        const ref = s.items[0];
        const id = `${m.material_key}-${s.items.length + 1}`;
        return { ...s, items: [...s.items, { id, material_key: m.material_key, thickness_m: m.thicknesses_m[0] ?? ref.thickness_m, length_m: ref.length_m, width_m: ref.width_m, ignite: false, t_ignite_s: 0 }] };
      });
    }}>
      <option value="">+ Add from PSI library</option>
      {MATERIALS.map((m) => <option key={m.material_key} value={m.material_key}>{depthLine(m)}{m.ignitable ? "" : " · smoke only"}</option>)}
    </select>
  );
}

function Describe() {
  const { set } = useSim();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ notes: string[]; rejected: string[]; error?: string } | null>(null);
  async function go() {
    setBusy(true); setMsg(null);
    try {
      const r = await fetch("/api/scenario", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setMsg({ notes: [], rejected: j.rejected ?? [], error: j.error ?? `Request failed (${r.status})` }); return; }
      const parsed = ScenarioSchema.safeParse(j.scenario);
      if (!parsed.success) { setMsg({ notes: j.notes ?? [], rejected: j.rejected ?? [], error: "The AI returned a scenario that failed validation; nothing was changed." }); return; }
      set({ a: parsed.data, b: null, editing: "a", presetId: null, replay: false, ra: null, rb: null, frame: 0, interp: { state: "idle" } });
      setMsg({ notes: j.notes ?? [], rejected: j.rejected ?? [] });
    } catch (e) { setMsg({ notes: [], rejected: [], error: String(e) }); } finally { setBusy(false); }
  }
  return (
    <div className="space-y-2 border-b border-line pb-3">
      <label htmlFor="describe" className="label">Describe a cabin</label>
      <textarea id="describe" rows={3} className="w-full" placeholder="Describe a cabin… e.g. a lunar habitat at 34% O₂ and 57 kPa with a SIBAL curtain near a photoelectric detector"
        value={text} onChange={(e) => setText(e.target.value)} />
      <div className="flex items-center gap-2">
        <button type="button" className="btn" disabled={busy || !text.trim()} onClick={go}>{busy ? "Building…" : "Fill the fields"}</button>
        <span className="text-[12px] text-faint">AI fills the fields; review them, then press Run.</span>
      </div>
      {msg?.error && <p className="text-[13px] text-warn" role="alert">{msg.error}</p>}
      {msg?.notes.map((n, i) => <p key={i} className="text-[12px] text-mute">• {n}</p>)}
      {msg?.rejected.map((n, i) => <p key={i} className="text-[12px] text-warn">✕ {n}</p>)}
    </div>
  );
}
