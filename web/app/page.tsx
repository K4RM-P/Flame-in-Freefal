"use client";
// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import summary from "@/data/validation/summary.json";
import kJson from "@/data/validation/droplet_K.json";
import { MISSIONS } from "@/lib/missions";
import { runSpread } from "@/lib/physics/models";
import { EQUATIONS } from "@/lib/equations";
import { INVESTIGATIONS } from "@/lib/ranking";
import { TEST_POINTS } from "@/lib/testPoints";
import { gravityName, psia, sig } from "@/lib/ui/format";
import { press } from "@/lib/ui/motion";
import { NumberTween, Segmented } from "@/components/ui-kit";
import { Plot } from "@/components/Plot";
import { Tex } from "@/components/Tex";

/* eslint-disable @typescript-eslint/no-explicit-any */
const T = (summary as any).targets as { status: string }[];
const K = kJson as any;
const ENVS = ["ISS", "LunarHabitat", "Mars"];

function Mesh() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { el.style.animationPlayState = e.isIntersecting ? "running" : "paused"; });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} aria-hidden className="pointer-events-none absolute inset-0 -z-10 opacity-80 motion-safe:animate-[mesh_24s_ease-in-out_infinite_alternate]"
      style={{ background: "radial-gradient(40% 50% at 70% 45%, rgba(76,154,255,0.22), transparent 70%), radial-gradient(28% 36% at 74% 52%, rgba(255,107,53,0.18), transparent 70%), radial-gradient(60% 60% at 20% 80%, rgba(76,154,255,0.06), transparent 70%)", backgroundSize: "140% 140%" }} />
  );
}

export default function Landing() {
  const [env, setEnv] = useState("LunarHabitat");
  const m = MISSIONS.find((x) => x.id === env)!;
  const r = useMemo(() => runSpread("sibal", m.x_o2, m.P_kPa, m.flow_cm_s, null, m.gravity_g, "opposed", 1), [m]);
  const pass = T.filter((t) => t.status === "pass").length, fail = T.filter((t) => t.status === "fail").length, pend = T.filter((t) => t.status === "pending data").length;
  const withData = new Set(TEST_POINTS.map((t) => t.investigation_id)).size;
  const bento = [
    ["Models", "Six combustion models — spread, droplet, suppression, gravity, cabin, smoke — each with equations and p05–p95 bands.", "/models/spread"],
    ["Flammability map", "Real ISS FLEX tests on an O₂ × flow map, with your mission marked.", "/console"],
    ["Gravity bounding", "Moon and Mars bracketed between µg and 1 g with a buoyant-equivalent flow. Never presented as measured.", "/models/gravity"],
    ["Receipts & validation", "Every number opens its equation, inputs, data rows and validation score. Failures stay visible.", "/validation"],
    ["Ask EmberAtlas", "A Claude analyst that answers only from model runs and cited sources; a guard removes unsupported numbers.", "/ask"],
    ["Next experiment", "Where PSI evidence runs out for your atmosphere, and which test points to fly next.", "/gaps"],
  ];
  return (
    <div>
      <style>{`@keyframes mesh{0%{background-position:0% 0%}100%{background-position:100% 60%}}`}</style>
      <section className="relative isolate overflow-hidden px-6 py-16 md:py-24">
        <Mesh />
        <div className="mx-auto grid max-w-[1200px] items-center gap-10 lg:grid-cols-2">
          <div className="space-y-6">
            <p className="label">NASA Space Apps 2026 · Flame in Freefall</p>
            <h1 className="display text-[48px] leading-[1.05] md:text-[64px]">Will it burn on the Moon?</h1>
            <p className="measure text-[20px] text-mute">Validated fire physics built on NASA&apos;s ISS combustion experiments, for the cabins Artemis crews will live in.</p>
            <div className="flex flex-wrap gap-3">
              <motion.span {...press}><Link href="/start" className="btn-accent" data-testid="cta-start">Check a material</Link></motion.span>
              <Link href="/console" className="btn">Open the console</Link>
            </div>
          </div>
          <div className="border border-line bg-panel p-5" style={{ borderRadius: 8 }} data-testid="mini-console">
            <p className="label mb-3">Live · SIBAL cabin fabric</p>
            <Segmented size="md" options={ENVS.map((id) => ({ v: id, label: MISSIONS.find((x) => x.id === id)!.name.split(" (")[0].replace("International Space Station", "ISS").replace("Lunar surface habitat", "Lunar habitat").replace("Mars habitat", "Mars") }))} value={env} onChange={setEnv} />
            <p className="num mt-4 text-[13px] text-mute">{Math.round(m.x_o2 * 100)}% O₂ · {sig(psia(m.P_kPa), 2)} psia · {gravityName(m.gravity_g)} · {m.flow_cm_s} cm/s fan</p>
            <p className="mt-2"><NumberTween value={r.value} s={2} className="text-[48px]" /> <span className="text-mute">mm/s flame spread</span></p>
            <p className="text-[13px] text-mute">de Ris theory · uncalibrated for solids · {m.gravity_g > 0 && m.gravity_g < 1 ? "bounded estimate" : "µg"}</p>
            <Link href={`/console?m=${env}`} className="mt-3 inline-block text-[13px] underline underline-offset-2">Open full verdict →</Link>
          </div>
        </div>
      </section>

      <section data-theme="light" className="bg-bg px-6 py-20 text-ink">
        <div className="mx-auto max-w-[1200px] grid gap-12 lg:grid-cols-2">
          <p className="serif text-[32px] italic leading-snug md:text-[40px]">A material that passes on Earth has never been tested in the air and gravity of a lunar habitat.</p>
          <ol className="space-y-6 text-[16px]">
            <li><span className="num block text-[24px]">34% O₂ · 8.2 psia</span><span className="text-mute">The proposed exploration atmosphere for lunar habitats — richer in oxygen than any ISS cabin.</span></li>
            <li><span className="block text-[24px]">Certified in 1 g</span><span className="text-mute">Cabin materials are screened with NASA-STD-6001 Test 1, an upward-burning pass/fail test on Earth.</span></li>
            <li><span className="num block text-[24px]">0 lunar-gravity tests</span><span className="text-mute">NASA&apos;s PSI combustion archive holds microgravity and 1 g data only.</span></li>
          </ol>
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto max-w-[1200px]">
          <p className="label mb-6">Meet Maya, materials and fire-safety engineer on a lunar habitat program</p>
          <div className="grid gap-6 md:grid-cols-3">
            {[["Before", "She must sign off cabin fabrics for 34% O₂ at 8.2 psia in 1/6 g. Her only tool is a 1 g pass/fail test, and the ISS data are scattered across ~24 investigations."],
              ["With EmberAtlas", "In under a minute she picks her environment and material and gets a bounded answer: how fast it spreads, how much CO₂ puts it out, what a fire does to the cabin — each number with a receipt."],
              ["After", "She signs off with evidence she can defend in a design review, and knows which experiment would close the gap."]].map(([h, t]) => (
              <div key={h} className="border-t border-line pt-4"><p className="text-[20px] font-medium">{h}</p><p className="measure mt-2 text-mute">{t}</p></div>))}
          </div>
        </div>
      </section>

      <section className="px-6 pb-20">
        <div className="mx-auto grid max-w-[1200px] gap-px border border-line bg-line md:grid-cols-3">
          {bento.map(([h, t, href]) => (
            <Link key={h} href={href} className="group relative block min-h-[150px] bg-bg p-6 hover:bg-panel">
              <p className="text-[20px] font-medium">{h}</p>
              <p className="mt-2 text-[14px] text-mute">{t}</p>
            </Link>))}
        </div>
      </section>

      <section data-theme="light" className="bg-bg px-6 py-20 text-ink">
        <div className="mx-auto grid max-w-[1200px] items-center gap-10 lg:grid-cols-2">
          <div className="space-y-4">
            <p className="label">Equation as proof</p>
            <div className="text-[24px]"><Tex tex={EQUATIONS.DR1.tex} block /></div>
            <p className="measure text-mute">The d²-law burning-rate constant, with an effective conductivity fitted on training FLEX campaigns, predicts held-out ISS droplet tests it never saw.</p>
            <p className="num text-[16px]">V5 ✓ burning-rate constant · MAPE {sig(K.metrics.mape, 3)}% on {K.metrics.n} held-out tests</p>
            <Link href="/validation" className="text-[13px] underline underline-offset-2">See every check, including the ones that fail →</Link>
          </div>
          <Plot theme="light" height={300} label="Parity plot: predicted vs observed burning-rate constant" data={[
            { x: [0, 1.1], y: [0, 1.1], mode: "lines", line: { dash: "dash", color: "#6B665E" }, hoverinfo: "skip", showlegend: false },
            { x: K.parity.map((p: any) => p.obs), y: K.parity.map((p: any) => p.pred), mode: "markers", marker: { color: "#0072B2", size: 7 }, showlegend: false, text: K.parity.map((p: any) => p.id) }]}
            layout={{ xaxis: { title: { text: "measured K (mm²/s)" } }, yaxis: { title: { text: "predicted K (mm²/s)" } } }} />
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto grid max-w-[1200px] gap-8 md:grid-cols-4">
          {[[`${TEST_POINTS.length}`, "verified ISS test points (FLEX)"], [`${withData} of ${INVESTIGATIONS.length}`, "investigations with verified data / catalogued"],
            [`${pass} ✓ · ${fail} ✗`, "validation checks passed · failed"], [`${pend}`, "checks waiting on digitized data"]].map(([n, l]) => (
            <div key={l}><p className="num text-[32px]">{n}</p><p className="text-[13px] text-mute">{l}</p></div>))}
        </div>
        <div className="mx-auto mt-16 grid max-w-[1200px] gap-8 border-t border-line pt-10 md:grid-cols-3">
          {[["What it does", "Calibrated combustion models · flammability map of real ISS tests · gravity bounding · cited AI analyst · validation lab · next-experiment designer."],
            ["What it saves you", "Answers in minutes instead of weeks. Numbers you can trace and defend. You know where the data ends."],
            ["How it feels", "Confidence signing off. Peace of mind for the crew. Being the engineer who asked the right question before launch."]].map(([h, t]) => (
            <div key={h}><p className="font-medium">{h}</p><p className="measure mt-1 text-mute">{t}</p></div>))}
        </div>
      </section>

      <footer className="border-t border-line px-6 py-10 text-[13px] text-mute">
        <div className="mx-auto flex max-w-[1200px] flex-wrap gap-x-8 gap-y-2">
          <span>Built on NASA data: <a className="underline" href="https://psi.nasa.gov/physci/repo/search?q=combustion" data-testid="psi-resource-link">PSI Data Repository: Combustion Science</a> and NASA Technical Reports Server documents.</span>
          <Link href="/methods" className="underline">Methods</Link>
          <a href="https://github.com/K4RM-P/Flame-in-Freefal" className="underline">GitHub</a>
          <span>MIT license</span>
          <span>Use of AI (SI): built with Claude Code; Claude API powers Ask. No SI-generated images or video.</span>
          <span>Text credits only; no NASA logos. Credits in CREDITS.md.</span>
        </div>
      </footer>
    </div>
  );
}
