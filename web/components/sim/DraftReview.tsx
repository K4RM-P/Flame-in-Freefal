"use client";

import { useState } from "react";
import { ScenarioSchema, type Scenario } from "@/lib/sim/types";
import type { ScenarioDraftResponse } from "@/lib/ai/scenario";
import { MATERIALS } from "./data";

type Path = (string | number)[];
type Field = { path: Path; label: string; scale?: number; choices?: [string, string][] };
const choices = (...values: string[]): [string, string][] => values.map((value) => [value, value]);
const fields: Field[] = [
  { path: ["name"], label: "Scenario name" },
  { path: ["cabin", "x_o2"], label: "Oxygen (%)", scale: .01 },
  { path: ["cabin", "P_Pa"], label: "Pressure (kPa)", scale: 1000 },
  { path: ["cabin", "gravity_g"], label: "Gravity (g)", scale: 1 },
  { path: ["cabin", "V_m3"], label: "Cabin volume (m³)", scale: 1 },
  { path: ["cabin", "flow_m_s"], label: "Airflow (cm/s)", scale: .01 },
  { path: ["cabin", "fan_off_on_alarm"], label: "Stop fan on alarm", choices: choices("true", "false") },
  { path: ["detection", "type"], label: "Detector type", choices: choices("photoelectric", "ionization") },
  { path: ["detection", "distance_m"], label: "Detector distance (m)", scale: 1 },
  { path: ["detection", "threshold"], label: "Detector threshold (mg/m³, optional)", scale: 1e-6 },
  { path: ["suppression", "agent"], label: "Suppression agent", choices: choices("none", "CO2", "N2") },
  { path: ["suppression", "delay_s"], label: "Suppression delay (s)", scale: 1 },
  { path: ["suppression", "mass_kg"], label: "Suppression mass (kg)", scale: 1 },
  { path: ["t_end_s"], label: "Duration (s)", scale: 1 },
];

type RecordValue = Record<string | number, unknown>;
const read = (value: unknown, keys: Path): unknown => keys.reduce<unknown>((current, key) => (current as RecordValue | undefined)?.[key], value);
function write(value: RecordValue, keys: Path, next: unknown) {
  const parent = read(value, keys.slice(0, -1)) as RecordValue;
  parent[keys[keys.length - 1]] = next;
}

export function DraftReview({ draft, onAccept }: { draft: ScenarioDraftResponse; onAccept: (scenario: Scenario) => void }) {
  const [data, setData] = useState(() => {
    const result = structuredClone(draft.scenario);
    if (!Array.isArray(result.items) || !result.items.length) result.items = [{ id: "item-1", material_key: null, ignite: false, t_ignite_s: 0 }];
    return result;
  });
  const [inputText, setInputText] = useState<Record<string, string>>({});
  const [issues, setIssues] = useState<string[]>([]);
  const itemFields: Field[] = (data.items as unknown[]).flatMap((_, index) => [
    { path: ["items", index, "material_key"], label: "Material", choices: MATERIALS.map((m): [string, string] => [m.material_key, m.display_name]) },
    { path: ["items", index, "thickness_m"], label: "Thickness (mm)", scale: .001 },
    { path: ["items", index, "length_m"], label: "Length (cm)", scale: .01 },
    { path: ["items", index, "width_m"], label: "Width (cm)", scale: .01 },
    { path: ["items", index, "ignite"], label: "Ignite this item", choices: choices("true", "false") },
    { path: ["items", index, "t_ignite_s"], label: "Ignition time (s)", scale: 1 },
  ].map((field) => ({ ...field, label: `Item ${index + 1} · ${field.label}` })));
  const allFields = [...fields, ...itemFields];

  function accept() {
    const parsed = ScenarioSchema.safeParse(data);
    const missingVolume = read(data, ["cabin", "V_m3"]) == null;
    const unsupported = (data.items as { material_key?: string; ignite?: boolean }[]).flatMap((item, index) =>
      item.ignite && !MATERIALS.find((m) => m.material_key === item.material_key)?.has_burn_data ? [`Item ${index + 1}: choose a material with burn data before igniting it.`] : []);
    if (parsed.success && !missingVolume && !unsupported.length) { onAccept(parsed.data); return; }
    setIssues([
      ...(!parsed.success ? parsed.error.issues.map((issue) => `${allFields.find(({ path }) => path.join(".") === issue.path.join("."))?.label ?? issue.path.join(".")}: ${issue.message}`) : []),
      ...(missingVolume ? ["Enter a cabin volume before loading the draft."] : []),
      ...unsupported,
    ]);
  }

  return <section className="panel mt-4 space-y-4 p-4" aria-labelledby="draft-review-title">
    <h2 className="text-xl font-semibold" id="draft-review-title">Draft ready for review</h2>
    <p className="text-mute">Fill in the blanks and check the extracted values. The simulation starts only when you choose Run.</p>
    {[...draft.notes, ...draft.rejected.map(({ requested, reason }) => `${requested}: ${reason}`)].map((note, i) => <p key={i} className="text-sm text-mute">{note}</p>)}
    <div className="grid gap-3 sm:grid-cols-2">
      {allFields.map(({ path, label, scale, choices: options }) => {
        const value = read(data, path);
        const key = path.join(".");
        const display = inputText[key] ?? (value == null ? "" : typeof value === "number" && scale ? String(Number((value / scale).toPrecision(12))) : String(value));
        function update(text: string) {
          setInputText((current) => ({ ...current, [key]: text }));
          const copy = structuredClone(data);
          write(copy, path, text === "" ? null : scale ? Number(text) * scale : options?.[0]?.[0] === "true" ? text === "true" : text);
          setData(copy);
        }
        return <label key={path.join(".")} className="min-w-0 text-sm">
          <span className="mb-1 block">{label}</span>
          {options ? <select className="w-full" value={display} onChange={(e) => update(e.target.value)}>
            <option value="">Choose…</option>{options.map(([key, name]) => <option key={key} value={key}>{name}</option>)}
          </select> : <input className="w-full" type={scale ? "number" : "text"} step={scale ? "any" : undefined} value={display} onChange={(e) => update(e.target.value)} />}
        </label>;
      })}
    </div>
    {issues.length > 0 && <ul role="alert" className="list-disc space-y-1 pl-5 text-warn">{issues.map((issue, i) => <li key={i}>{issue}</li>)}</ul>}
    <button className="btn-accent" type="button" onClick={accept}>Load reviewed draft →</button>
  </section>;
}
