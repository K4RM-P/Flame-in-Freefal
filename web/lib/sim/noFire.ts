// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Why a run produced no flame, and the one-click fix. Pure: reads the scenario, the engine result and any rejected
// material from the builder. Never guesses: the oxygen reason quotes the engine's own extinction detail.
import { MATERIALS } from "./params";
import { presetById } from "./presets";
import type { Scenario, SimResult } from "./types";

export type NoFireReason = "nothing_to_burn" | "no_ignition" | "too_little_oxygen" | "material_not_in_data";
export type NoFireFix =
  | { kind: "ignite_item"; item_id: string; label: string }
  | { kind: "add_material"; material_key: string; label: string };
export interface NoFire { reason: NoFireReason; title: string; detail: string; fix: NoFireFix | null }

const ign = () => MATERIALS.find((m) => m.material_key === "sibal" && m.ignitable) ?? MATERIALS.find((m) => m.ignitable) ?? null;
const nameOf = (k: string) => MATERIALS.find((m) => m.material_key === k)?.display_name ?? k;

export function firstBurningFrame(r: SimResult | null): number {
  if (!r) return -1;
  for (let i = 0; i < r.t.length; i++) if (r.items.some((it) => it.status[i] === "burning")) return i;
  return -1;
}

/** null when the run has a burning frame (there is a fire to show). */
export function noFireReason(s: Scenario, r: SimResult | null, rejected: { requested: string; closest: string | null }[] = []): NoFire | null {
  if (r && firstBurningFrame(r) >= 0) return null;
  const burnable = s.items.filter((i) => MATERIALS.find((m) => m.material_key === i.material_key)?.ignitable);
  if (!burnable.length) {
    const rej = rejected[0];
    if (rej) {
      const k = rej.closest && MATERIALS.find((m) => m.material_key === rej.closest)?.ignitable ? rej.closest : ign()?.material_key ?? null;
      return { reason: "material_not_in_data", title: "Material not in NASA's data", detail: `“${rej.requested}” has no PSI burn tests, so the engine cannot burn it.${k ? ` Closest NASA-tested material: ${nameOf(k)}.` : ""}`,
        fix: k ? { kind: "add_material", material_key: k, label: `Use ${nameOf(k)} (NASA-tested)` } : null };
    }
    const k = ign()?.material_key;
    return { reason: "nothing_to_burn", title: "Nothing to catch fire", detail: s.items.length ? s.items.map((i) => { const m = MATERIALS.find((x) => x.material_key === i.material_key); return m?.has_burn_data ? `${m.display_name} has PSI burn tests but no spread properties in properties.json, so the engine cannot burn it.` : `${m?.display_name ?? i.material_key} has PSI smoke data only (no burn tests).`; }).join(" ") : "The cabin has no flammable items.",
      fix: k ? { kind: "add_material", material_key: k, label: `Add ${nameOf(k)} (NASA-tested) with an ignition source` } : null };
  }
  const lit = burnable.filter((i) => i.ignite && i.t_ignite_s < s.t_end_s);
  if (!lit.length) {
    const it = burnable[0];
    return { reason: "no_ignition", title: "No ignition source", detail: burnable.some((i) => i.ignite) ? `The ignition time is after the end of the run (${s.t_end_s} s).` : "Items can burn, but nothing ignites them.",
      fix: { kind: "ignite_item", item_id: it.id, label: `Add an ignition source to the ${nameOf(it.material_key)}` } };
  }
  const ext = r?.events.find((e) => e.kind === "extinguished" && lit.some((i) => i.id === e.item_id));
  return { reason: "too_little_oxygen", title: "Too little oxygen to burn",
    detail: ext ? `The engine put the flame out at ignition — ${ext.detail} (O₂ ${(s.cabin.x_o2 * 100).toFixed(1)} %).` : `No burning frame at O₂ ${(s.cabin.x_o2 * 100).toFixed(1)} %.`, fix: null };
}

/** Applies a fix to a copy of the scenario. */
export function applyNoFireFix(s: Scenario, fix: NoFireFix): Scenario {
  const c = structuredClone(s);
  if (fix.kind === "ignite_item") c.items = c.items.map((i) => (i.id === fix.item_id ? { ...i, ignite: true, t_ignite_s: 0 } : { ...i }));
  else {
    const m = MATERIALS.find((x) => x.material_key === fix.material_key)!;
    // Size from the existing item, else the NASA-tested SAFFIRE-I sample (PSI-98 S1) used by the lunar-tune preset.
    const ref = c.items[0] ?? (presetById("lunar-tune")!.build() as Scenario).items[0];
    const item = { id: `${m.material_key}-${c.items.length + 1}`, material_key: m.material_key, thickness_m: m.thicknesses_m[0] ?? ref.thickness_m, length_m: ref.length_m, width_m: ref.width_m, ignite: true, t_ignite_s: 0 };
    c.items = [...c.items.filter((i) => MATERIALS.find((x) => x.material_key === i.material_key)), item];
  }
  return c;
}
