"use client";
import Link from "next/link";
import { useMemo } from "react";
import { useMission } from "@/lib/store";
import { MISSIONS } from "@/lib/missions";
import { runDroplet, runGravity, runSpread, runSuppression } from "@/lib/physics/models";
import { Band, ModelLink, SourcePill, ValidityBadges, fmt } from "@/components/bits";
import { Caveat } from "@/components/Nav";
import summary from "@/data/validation/summary.json";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TARGETS = (summary as any).targets as { status: string }[];

export default function Brief() {
  const m = useMission();
  const grav = useMemo(() => runGravity(m.x_o2, m.P_kPa, m.flow_cm_s, m.gravity_g || 0.165), [m.x_o2, m.P_kPa, m.flow_cm_s, m.gravity_g]);
  const spread = useMemo(() => runSpread("sibal", m.x_o2, m.P_kPa, m.flow_cm_s, null, m.gravity_g, "opposed", 200), [m.x_o2, m.P_kPa, m.flow_cm_s, m.gravity_g]);
  const supp = useMemo(() => runSuppression("n-heptane", m.x_o2, m.P_kPa, "CO2", 150), [m.x_o2, m.P_kPa]);
  const drop = useMemo(() => runDroplet("n-heptane", m.x_o2, m.P_kPa, 3, "N2", 0, 150), [m.x_o2, m.P_kPa]);
  const pass = TARGETS.filter((t) => t.status === "pass").length, fail = TARGETS.filter((t) => t.status === "fail").length;
  const pend = TARGETS.filter((t) => t.status === "pending data").length;
  return (
    <div className="space-y-8">
      <section className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          <p className="label text-accent">NASA Space Apps 2026 · Flame in Freefall</p>
          <h1 className="text-4xl font-semibold leading-tight">In space, fire is the emergency you can&apos;t run from.</h1>
          <p className="text-lg text-mute">
            EmberAtlas turns NASA&apos;s ISS microgravity fire experiments into combustion models an Artemis designer can run — each number with its
            equation, uncertainty band, validation score and source.
          </p>
          <div className="flex flex-wrap gap-2">
            {MISSIONS.map((q) => (
              <button key={q.id} onClick={() => m.applyPreset(q.id)} className={`btn ${m.preset === q.id ? "border-accent text-accent" : ""}`}>
                {q.name} · {Math.round(q.x_o2 * 100)}% / {q.P_kPa} kPa
              </button>
            ))}
          </div>
          <div className="flex gap-3"><Link href="/console" className="btn-accent">Open the Fire Risk Console →</Link><Link href="/validation" className="btn">Validation Lab</Link></div>
          <Caveat />
        </div>
        <div className="card lg:col-span-2">
          <p className="label">Model scorecard (held-out data)</p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div><div className="num text-3xl text-ok">{pass}</div><div className="text-xs text-mute">pass</div></div>
            <div><div className="num text-3xl text-bad">{fail}</div><div className="text-xs text-mute">fail (reported)</div></div>
            <div><div className="num text-3xl text-warn">{pend}</div><div className="text-xs text-mute">pending data</div></div>
          </div>
          <p className="mt-3 text-xs text-mute">275 verified FLEX droplet tests extracted from NASA/TP-2015-216046 <SourcePill id="ntrs-20150023456" /></p>
        </div>
      </section>
      <section className="grid gap-4 md:grid-cols-3">
        <Headline title="Buoyant flow this gravity adds" link="gravity" value={`${fmt(grav.extra.u_b_cm_s as number)} cm/s`} r={grav}
          note={`Equivalent relative flow ${fmt(grav.value)} cm/s at ${m.gravity_g || 0.165} g. Lunar buoyancy falls in the low-flow range where µg opposed spread is most sensitive (BASS-II).`} />
        <Headline title="SIBAL opposed spread (theory)" link="spread" value={`${fmt(spread.value)} mm/s`} r={spread}
          note={`Band [forced only, g-equivalent]: ${fmt((spread.extra.band_mm_s as number[])[0])}–${fmt((spread.extra.band_mm_s as number[])[1])} mm/s.`} />
        <Headline title="CO₂ to inert a heptane fire" link="suppression" value={`${fmt((supp.extra.x_agent_ug as number) * 100)}%`} r={supp}
          note={`µg-calibrated; 1 g reference ${fmt((supp.extra.x_agent_1g as number) * 100)}%. Heptane droplet K here: ${fmt(drop.value)} mm²/s.`} />
      </section>
    </div>
  );
}

function Headline({ title, value, note, r, link }: { title: string; value: string; note: string; r: ReturnType<typeof runSpread>; link: string }) {
  return (
    <div className="card space-y-2">
      <div className="flex items-center justify-between"><span className="label">{title}</span><ModelLink id={link} /></div>
      <div className="flex items-baseline gap-3"><span className="num text-3xl text-accent">{value}</span><Band r={r} /></div>
      <ValidityBadges r={r} />
      <p className="text-sm text-mute">{note}</p>
    </div>
  );
}
