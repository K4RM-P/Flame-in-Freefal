"use client";
// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// B7: concept recommendations derived from model outputs (smoke, suppression) and cited PSI data. Software-only.
import { useMemo } from "react";
import Link from "next/link";
import { useMission } from "@/lib/store";
import { runSmoke, runSuppression } from "@/lib/physics/models";
import { SourcePill, fmt } from "@/components/bits";
import sm from "@/data/psi/smoke_measures.json";
import props from "@/data/properties.json";
import inv from "@/data/investigations.json";

const TRANSPORT_S = 120; // same transport time as the Detection card above
const AGENTS = ["CO2", "N2", "HE"] as const;
const SMOKE = sm as unknown as { by_material: { material: string; cmd_um: number; rank_m0: number; rank_dusttrak_b_mg_m3: number }[] };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const PHOTO = (props as any).smoke.photoelectric_threshold_nm as { value: number; status: string; source: string };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const LOW_FLOW = ((inv as any)["BASS-II"].key_findings as { text: string; source_id: string }[]).find((f) => /flow below/.test(f.text));

export function DesignSuggestions() {
  const m = useMission();
  const r = useMemo(() => ({
    smoke: runSmoke(TRANSPORT_S),
    supp: AGENTS.map((a) => ({ a, r: runSuppression("n-heptane", m.x_o2, m.P_kPa, a, 100) })),
  }), [m.x_o2, m.P_kPa]);
  const cmd = SMOKE.by_material.map((x) => x.cmd_um);
  const swapped = SMOKE.by_material.filter((x) => x.rank_m0 !== x.rank_dusttrak_b_mg_m3).map((x) => x.material);
  const thermal = r.supp.filter((s) => s.a !== "HE").sort((a, b) => a.r.value - b.r.value);
  const best = thermal[0];
  const fav = r.smoke.extra.favoured_detector as string;
  return (
    <section className="card space-y-3 text-sm" data-testid="design-suggestions">
      <div className="flex flex-wrap items-center gap-2"><h2 className="text-[20px] font-semibold">Design suggestions</h2>
        <span className="chip bg-warn/15 text-warn">concept recommendations · software-only · not certified</span></div>
      <p className="text-xs text-mute">Each suggestion is derived from a model output or a PSI record shown with it, for {fmt(m.x_o2 * 100)}% O₂ at {fmt(m.P_kPa, 3)} kPa. Data analysis remains the main result; these are starting points for a design review.</p>
      <ol className="ml-5 list-decimal space-y-3">
        <li data-testid="suggest-detection"><b>Detection principle.</b> After {TRANSPORT_S} s transport the smoke model gives a volume-mean diameter of {fmt(r.smoke.value, 3)} nm
          ({fmt(r.smoke.uncertainty.p05, 3)}–{fmt(r.smoke.uncertainty.p95, 3)}) and d43 {fmt(r.smoke.extra.d43_nm as number, 3)} nm, below the {fmt(PHOTO.value)} nm photoelectric threshold
          {PHOTO.status === "TODO_VERIFY" ? " (to verify)" : ""}, so it favours an <b>{fav}</b>-type (first-moment) channel. Flight smoke count-mean diameters spanned {fmt(Math.min(...cmd), 2)}–{fmt(Math.max(...cmd), 2)} µm,
          and number and mass rankings disagreed for {swapped.join(" and ")}: pair a first-moment channel with a light-scattering mass channel and qualify both across that size range.
          {" "}<span className="text-xs text-mute">Smoke model is uncalibrated (N₀, d₀ defaults).</span> <SourcePill id="seinfeld-pandis" /><SourcePill id={PHOTO.source} /><SourcePill id="PSI-101" /></li>
        <li data-testid="suggest-suppression"><b>Suppressant.</b> For n-heptane (the fuel with a µg-calibrated T<sub>crit</sub>), thermal theory needs {r.supp.map((s) => `${s.a === "HE" ? "He" : s.a.replace("2", "₂")} ${fmt(s.r.value * 100, 3)}%`).join(", ")} (mole fraction added to the cabin).
          The smallest required concentration is <b>{best.a.replace("2", "₂")} at {fmt(best.r.value * 100, 3)}%</b> ({fmt(best.r.uncertainty.p05 * 100, 3)}–{fmt(best.r.uncertainty.p95 * 100, 3)}%). Helium is excluded from this choice because FLEX shows it performs differently than thermal theory predicts.
          {" "}<Link className="underline" href="/models/suppression">Model page</Link> <SourcePill id="sfpe-beyler" /><SourcePill id="dietrich-2014" /></li>
        <li data-testid="suggest-ventilation"><b>Ventilation shutdown.</b> Not computed: the flammability-boundary model (burn vs extinguish at low flow) is not built yet, because PSI has no solid burn/extinct outcome table.
          {LOW_FLOW && <> Flight observation to weigh before relying on fan shutdown: &ldquo;{LOW_FLOW.text}&rdquo; <span className="chip bg-warn/15 text-warn">to verify</span> <SourcePill id={LOW_FLOW.source_id} /></>}
          {" "}Mission flow here: {fmt(m.flow_cm_s)} cm/s.</li>
      </ol>
    </section>
  );
}
