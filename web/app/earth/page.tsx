"use client";
// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
import { useMemo } from "react";
import { runHabitat, runSpread, runSuppression } from "@/lib/physics/models";
import { ModelLink, SourcePill, ValidityBadges, fmt } from "@/components/bits";

export default function Earth() {
  const cases = useMemo(() => [
    { title: "O₂-enriched hospital room / home oxygen", r: runSpread("cotton", 0.30, 101.3, 10, 0.1, 1, "opposed", 100),
      text: (v: number) => `Cotton bedding (0.1 mm) at 30% O₂, 1 atm, opposed buoyant flow: ${fmt(v)} mm/s vs ${fmt(runSpread("cotton", 0.21, 101.3, 10, 0.1, 1, "opposed", 1).value)} mm/s in air.`, unit: "mm/s" },
    { title: "Submarine compartment fire", r: runHabitat("cotton", 0.21, 101.3, 150, 50, 300, 1800, 120, false, 10),
      text: (v: number) => `50 kW t²-growth fire for 5 min in 150 m³ sealed air: ΔT ≈ ${fmt(v)} K (well-mixed upper bound on mixing; no stratification).`, unit: "K" },
    { title: "Aircraft cabin at cruise pressure (≈75 kPa)", r: runSpread("pmma", 0.21, 75.3, 20, 3, 1, "opposed", 100),
      text: (v: number) => `3 mm PMMA trim, 20 cm/s opposed flow: ${fmt(v)} mm/s — thick-fuel spread falls with pressure (ρ_g ∝ P).`, unit: "mm/s" },
    { title: "Mine refuge chamber inerting", r: runSuppression("methanol", 0.21, 101.3, "N2", 100),
      text: () => "", unit: "fraction" },
  ], []);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Earth applications</h1>
      <p className="text-sm text-mute">The same physics, run for O₂-enriched or sealed environments on Earth. All theory-level unless marked calibrated. NASA spin-offs from fire research include water-mist suppression, smoke vs dust discrimination in detectors, and lighter firefighter air tanks.</p>
      <div className="grid gap-4 md:grid-cols-2">
        {cases.map((c) => (
          <article key={c.title} className="card space-y-2 text-sm">
            <div className="flex items-center justify-between"><span className="label">{c.title}</span><ModelLink id={c.r.model_id} /></div>
            <div className="num text-2xl text-ink">{fmt(c.r.value)} <span className="text-sm text-mute">{c.r.units}</span></div>
            <ValidityBadges r={c.r} />
            <p>{c.title.startsWith("Mine") ? `N₂ needed to inert a methanol diffusion flame in air: ≈${fmt(c.r.value * 100)}% (µg-calibrated T_crit) vs ${fmt((c.r.extra.x_agent_1g as number) * 100)}% with the 1 g reference.` : c.text(c.r.value)}</p>
            <div>{c.r.sources.slice(0, 3).map((s) => <SourcePill key={s} id={s} />)}</div>
          </article>
        ))}
      </div>
    </div>
  );
}
