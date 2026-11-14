"use client";
// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
import { useMemo } from "react";
import { useMission } from "@/lib/store";
import { runDroplet, runGravity, runHabitat, runSmoke, runSpread, runSuppression } from "@/lib/physics/models";
import { ModelLink, SourcePill, fmt } from "@/components/bits";
import { Caveat } from "@/components/Nav";
import { SmokeMeasures } from "@/components/SmokeMeasures";
import { DesignSuggestions } from "@/components/DesignSuggestions";
import sm from "@/data/psi/smoke_measures.json";

const SMOKE = sm as unknown as { by_material: { cmd_um: number }[] };

export default function Implications() {
  const m = useMission();
  const r = useMemo(() => ({
    grav: runGravity(m.x_o2, m.P_kPa, m.flow_cm_s, 0.165),
    sp: runSpread("sibal", m.x_o2, m.P_kPa, m.flow_cm_s, null, m.gravity_g, "opposed", 100),
    sp21: runSpread("sibal", 0.21, 101.3, m.flow_cm_s, null, m.gravity_g, "opposed", 1),
    su: runSuppression("n-heptane", m.x_o2, m.P_kPa, "CO2", 100),
    dr: runDroplet("n-heptane", m.x_o2, m.P_kPa, 3, "N2", 0, 50),
    hab: runHabitat("cotton", m.x_o2, m.P_kPa, m.V_m3, 10, 300, 1800, 0, false, 10),
    sm: runSmoke(120),
  }), [m]);
  const cards = [
    { pillar: "Prevention", conf: "medium", model: "gravity",
      text: `Lunar buoyancy adds an equivalent flow of ≈${fmt(r.grav.extra.u_b_cm_s as number)} cm/s (bounded estimate). Material screening at ${fmt(m.x_o2 * 100)}% O₂ should include low-flow (0–${fmt(r.grav.extra.u_b_cm_s as number)} cm/s) opposed-spread tests, not only 1 g upward burning.`,
      src: ["olson-1991", "bass2-sci-rep-2017", "ntrs-20240015307"] },
    { pillar: "Prevention", conf: "low (uncalibrated)", model: "spread",
      text: `De Ris theory gives SIBAL spread ${fmt(r.sp.value)} mm/s here vs ${fmt(r.sp21.value)} mm/s at ISS air (×${fmt(r.sp.value / r.sp21.value, 2)}). Thin-fuel spread scales with flame temperature, which rises with O₂ mass fraction; pressure enters only through thick fuels.`,
      src: ["de-ris-1969", "quintiere-ffp"] },
    { pillar: "Detection", conf: "low (uncalibrated)", model: "smoke",
      text: `After 2 min transport, coagulation moves the size distribution only modestly (d43 ≈ ${fmt(r.sm.extra.d43_nm as number)} nm at default N₀). SAME/SAME-R flight medians of the count-mean diameter span ${fmt(Math.min(...SMOKE.by_material.map((x) => x.cmd_um)), 2)}–${fmt(Math.max(...SMOKE.by_material.map((x) => x.cmd_um)), 2)} µm across materials, so detectors should be qualified across that range (see "one smoke, three signals" below).`,
      src: ["PSI-101", "seinfeld-pandis"] },
    { pillar: "Detection", conf: "low (uncalibrated)", model: "habitat",
      text: `A 10 kW, 5 min cotton fire in ${m.V_m3} m³ raises cabin temperature by ≈${fmt(r.hab.value)} K and pressure by ${fmt(r.hab.extra.peak_dP_kPa as number)} kPa; CO peaks at ${fmt(r.hab.extra.peak_co_ppm as number)} ppm against a 1 h SMAC of 425 ppm. Pressure-rise and CO sensing are complementary detection channels.`,
      src: ["huggett-1980", "jsc-20584-revC"] },
    { pillar: "Suppression", conf: "medium (V3/V4 pass)", model: "suppression",
      text: `Thermal-inerting theory, calibrated on FLEX, needs ≈${fmt((r.su.extra.x_agent_ug as number) * 100)}% CO₂ (µg) vs ${fmt((r.su.extra.x_agent_1g as number) * 100)}% (1 g reference) for heptane at this atmosphere. The O₂-enriched exploration atmosphere needs far more agent than ISS air.`,
      src: ["dietrich-2014", "sfpe-beyler", "nfpa-2001"] },
    { pillar: "Suppression", conf: "evidence conflict", model: "suppression",
      text: "Do not assume helium is a weak suppressant from heat capacity alone: FLEX He LOIs exceed thermal-theory predictions. Treat He vs CO₂ as configuration-dependent until tested on solids.",
      src: ["dietrich-2014", "drop-tower-suppressant"] },
  ];
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Design implications</h1>
      <Caveat />
      <SmokeMeasures />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <article key={c.text} className="card space-y-2 text-sm">
            <div className="flex items-center justify-between"><span className="label text-ink">{c.pillar}</span><ModelLink id={c.model} /></div>
            <p>{c.text}</p>
            <p className="text-xs text-mute">confidence: {c.conf}</p>
            <div>{c.src.map((s) => <SourcePill key={s} id={s} />)}</div>
          </article>
        ))}
      </div>
      <DesignSuggestions />
    </div>
  );
}
