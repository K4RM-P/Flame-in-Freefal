// SI-assisted: written with Codex (OpenAI); see README "Use of AI (SI)".
import Link from "next/link";
import { OverviewIntro } from "./OverviewIntro";
import { FlexChart } from "./FlexChart";
import tablesIndex from "@/data/psi/tables_index.json";
import flexCrosscheck from "@/data/psi/flex_crosscheck.json";
import dropletK from "@/data/validation/droplet_K.json";
import { earthVsOrbitSummary, evidenceStops } from "@/lib/sim/evidence";
import { media } from "@/lib/media";

const NASA_IMAGE = media.hero.src;
const NASA_IMAGE_SOURCE = media.hero.sourceUrl;
const RUN_HREF = "/simulator?preset=iss-vs-lunar&run=1";

// Trust-strip numbers are computed from the shipped data files, never typed in.
const psiRows = (tablesIndex as { rows: number }[]).reduce((sum, t) => sum + t.rows, 0);
const psiAccessions = new Set((tablesIndex as { accessions: string[] }[]).flatMap((t) => t.accessions)).size;
const flex = flexCrosscheck as { values_compared: number; mismatches: unknown[] };
const flexMetrics = (dropletK as { metrics: { n: number; mape: number } }).metrics;
const pct = (x: number) => `${Math.round(x * 100)}%`;

function RunCta() {
  return <Link href={RUN_HREF} className="btn-accent" data-testid="cta-run">Run ISS vs Lunar Habitat</Link>;
}
// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Scroll-driven landing (same arc as the pitch deck). All numbers come from lib/landing/facts (data + engine).
import { existsSync } from "node:fs";
import { join } from "node:path";
import dynamic from "next/dynamic";
import summary from "@/data/validation/summary.json";
import { landingFacts } from "@/lib/landing/facts";
import { Hero } from "./Hero";
import { Story } from "./Story";
import { FinalCta, Findings, LandingFooter, LiveDemo, Marquee, Trust } from "./Sections";

const Bento = dynamic(() => import("./Bento").then((m) => m.Bento));
const HowItWorks = dynamic(() => import("./HowItWorks").then((m) => m.HowItWorks));

export function LandingPage() {
  const f = landingFacts();
  const targets = (summary as { targets: { status: string }[] }).targets;
  const video = existsSync(join(process.cwd(), "public/media/demo.mp4"));
  return (
    <>
      <OverviewIntro image={NASA_IMAGE} source={NASA_IMAGE_SOURCE} run={RUN_HREF} />
      <div id="findings" className="ea-findings mx-auto max-w-6xl px-4 pb-16 sm:px-6">
      <section className="ea-photo-story" aria-labelledby="photo-story-title">
        <figure>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={media.saffire.src} alt={media.saffire.alt} width={1280} height={1037} loading="lazy" decoding="async" />
          <figcaption>Saffire-IV fabric burn · NASA / Glenn</figcaption>
        </figure>
        <div className="ea-photo-story__copy">
          <p className="label">Spacecraft Fire Safety Experiment</p>
          <h2 id="photo-story-title">From flame to flight evidence.</h2>
          <p className="text-base text-mute">NASA’s Saffire experiments burned materials inside uncrewed spacecraft. Explore the earlier Saffire-II dataset to compare how matching samples behaved on Earth and in orbit.</p>
          <Link className="btn mt-4" href="/evidence#earth-vs-orbit">Compare the tests ↗</Link>
        </div>
      </section>
      <section className="mt-12 border-l-2 border-accent bg-panel p-5 md:p-8" aria-labelledby="design-question">
        <p className="label">From experiment to design decision</p>
        <h2 id="design-question" className="display mt-2 text-2xl md:text-4xl">What would you test before flying a cabin material?</h2>
        <p className="measure mt-3 text-base text-mute">A lunar cabin is one example. Compare ground and orbital tests, then see where evidence runs out for the selected lunar habitat at {pct(lunarO2)} oxygen and {stops.mission.P_Pa / 1000} kPa.</p>
      </section>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <section className="card border-t-2 border-t-accent p-5 md:p-6" aria-labelledby="f1-title">
          <p className="label">Saffire-II</p>
          <h2 id="f1-title" className="display mt-2 text-xl">Does the Earth test hold up in orbit?</h2>
          <p className="mt-3 text-[15px]" data-testid="landing-orbit-counts"><span className="num">{n}</span> like-for-like samples: <span className="num">{better}</span> less flammable in orbit, <span className="num">{same}</span> the same, <span className="num">{worse}</span> worse.</p>
          <p className="mt-3 text-[12px] text-faint">SAFFIRE-II, PSI-99, like-for-like samples, small n</p>
        </section>
        <section className="card border-t-2 border-t-accent p-5 md:p-6" aria-labelledby="f2-title">
          <p className="label">Test coverage</p>
          <h2 id="f2-title" className="display mt-2 text-xl">Where the evidence stops</h2>
          <p className="mt-3 text-[15px]">Highest O₂ at which any solid was burned in PSI: <span className="num">{maxSolid == null ? "no data" : pct(maxSolid)}</span>. The lunar habitat breathes <span className="num text-warn">{pct(lunarO2)}</span>.</p>
          <p className="mt-3 text-[12px] text-faint">{stops.bre_note}</p>
        </section>
        <section className="card border-t-2 border-t-accent p-5 md:p-6" aria-labelledby="f3-title">
          <p className="label">Cabin model</p>
          <h2 id="f3-title" className="display mt-2 text-xl">Simulate beyond it</h2>
          <p className="mt-3 text-[15px]">Every result past the tested envelope carries an EXTRAPOLATED badge, and the app proposes the next test to fly.</p>
          <div className="mt-4"><RunCta /></div>
        </section>
      </div>

      <FlexChart />

      <section className="mt-16 border-y border-line py-12" aria-labelledby="platform-title">
        <div className="max-w-3xl"><p className="label">One workspace, three decisions</p><h2 id="platform-title" className="display mt-2 text-3xl md:text-5xl">From NASA evidence to a testable cabin decision.</h2><p className="mt-4 text-lg leading-relaxed text-mute">EmberAtlas keeps the source, model, and uncertainty together. Start from a NASA experiment, build a custom cabin, or ask whether your design resembles a test that already exists.</p></div>
        <div className="mt-8 grid gap-px border border-line bg-line md:grid-cols-3"><div className="bg-bg p-5"><p className="label">01 · Find</p><h3 className="mt-2 text-xl font-semibold">Match a prior experiment</h3><p className="mt-3 text-sm leading-relaxed text-mute">Search the bundled PSI catalog by material, atmosphere, flow, gravity, and measurement type.</p></div><div className="bg-bg p-5"><p className="label">02 · Run</p><h3 className="mt-2 text-xl font-semibold">Replay or model a cabin</h3><p className="mt-3 text-sm leading-relaxed text-mute">Run a sourced preset or enter your own SI variables. Required gaps stay visible instead of becoming hidden defaults.</p></div><div className="bg-bg p-5"><p className="label">03 · Review</p><h3 className="mt-2 text-xl font-semibold">Know what remains untested</h3><p className="mt-3 text-sm leading-relaxed text-mute">Inspect receipts, Monte Carlo bands, theory-only models, replay error, and the next test the evidence calls for.</p></div></div>
      </section>
      <section className="mt-8 border-t border-line pt-4 text-[13px] text-mute" aria-label="Trust and limits">
        <ul className="space-y-1">
          <li><span className="num">{psiRows.toLocaleString("en-US")}</span> PSI rows with provenance from <span className="num">{psiAccessions}</span> accessions</li>
          <li>FLEX cross-check against NTRS: <span className="num">{flex.mismatches.length}</span> mismatches in <span className="num">{flex.values_compared.toLocaleString("en-US")}</span> values</li>
          <li>Held-out FLEX burning-rate MAPE <span className="num">{flexMetrics.mape.toFixed(1)}%</span> (n = <span className="num">{flexMetrics.n}</span>)</li>
          <li>Not for flight certification. <Link href="/methods#limitations" className="underline">Limitations</Link></li>
        </ul>
      </section>
      </div>
    </>
    <div className="bg-bg">
      <Hero status={{ experiments: f.psi.accessions, rows: f.psi.rows, mismatches: f.flex.mismatches, compared: f.flex.compared }} />
      <Story f={f.stops} />
      <Bento f={{ front: f.run?.front ?? null, aName: f.run?.aName ?? "A", bName: f.run?.bName ?? "B", evidence: f.run?.evidence ?? [], fixes: f.run?.fixes ?? [], next: f.run?.next ?? null }} />
      <HowItWorks />
      <LiveDemo run={f.run} video={video} />
      <Findings f={f} />
      <Marquee chips={f.psi.chips} />
      <Trust f={f} pass={targets.filter((t) => t.status === "pass").length} total={targets.length} />
      <FinalCta />
      <LandingFooter />
    </div>
  );
}
