// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// B6: how to read the suppression model's flame temperature. It is a calculated (adiabatic) limit, not a measurement.
import type { ModelResult } from "@/lib/physics/models";
import { T_AMB } from "@/lib/physics/models";
import { SourcePill, fmt } from "@/components/bits";

export function SuppressionFraming({ r, compact = false }: { r: ModelResult; compact?: boolean }) {
  const x = r.extra as Record<string, number | null>;
  const i = r.inputs as Record<string, string | number>;
  const lines = (
    <>
      <p><b>T<sub>crit</sub> is an ideal, calculated flame temperature where the flame can no longer survive</b>, not a measured value:
        {x.T_crit_ug_K != null ? ` ${fmt(x.T_crit_ug_K, 4)} K (µg, fitted to FLEX LOIs)` : ""} and {fmt(x.T_crit_1g_K as number, 4)} K (1 g reference).
        Computed for {String(i.fuel)} burning stoichiometrically in the mission mixture ({fmt(Number(i.x_o2) * 100)}% O₂ plus {String(i.agent)}),
        starting at {fmt(T_AMB, 3)} K and {fmt(Number(i.P_kPa), 3)} kPa.</p>
      <p>Real flames also lose heat by radiation and conduction, so they can go out above this ideal temperature.</p>
      <p>Helium departs from N₂ and CO₂ in FLEX: He LOIs exceed thermal-theory predictions. This is a finding about heat and mass transport
        (helium&apos;s high diffusivity), not noise <SourcePill id="dietrich-2014" /></p>
    </>
  );
  if (compact) return <div className="mt-2 space-y-1 text-[12px] text-mute" data-testid="supp-framing">{lines}</div>;
  return (
    <section className="card space-y-2 text-sm" data-testid="supp-framing">
      <span className="label">How to read this result</span>
      {lines}
      <div><span className="label">Assumptions</span><ul className="ml-5 list-disc">{r.assumptions.map((a) => <li key={a}>{a}</li>)}</ul></div>
    </section>
  );
}
