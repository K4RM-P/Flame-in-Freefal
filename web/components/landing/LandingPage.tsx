// SI-assisted: written with Codex (OpenAI); see README "Use of AI (SI)".
import Link from "next/link";
import tablesIndex from "@/data/psi/tables_index.json";
import flexCrosscheck from "@/data/psi/flex_crosscheck.json";
import dropletK from "@/data/validation/droplet_K.json";
import { earthVsOrbitSummary, evidenceStops } from "@/lib/sim/evidence";

const NASA_IMAGE = "https://science.nasa.gov/wp-content/uploads/2024/01/jsc2023e002281orig.jpg?format=jpeg&w=1280";
const NASA_IMAGE_SOURCE = "https://science.nasa.gov/biological-physical/stories/how-and-why-do-nasa-researchers-simulate-microgravity-on-earth/";
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

export function LandingPage() {
  const orbit = earthVsOrbitSummary();
  const { better, same, worse, n } = orbit.counts;
  const stops = evidenceStops("LunarHabitat");
  const lunarO2 = stops.mission.x_o2;
  const maxSolid = stops.max_solid_x_o2;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <section className="grid items-center gap-8 md:grid-cols-[1.1fr_1fr]" aria-labelledby="landing-title">
        <div>
          <p className="label">NASA Space Apps · Flame in Freefall</p>
          <h1 id="landing-title" className="display mt-3 text-4xl sm:text-5xl">Will it burn on the Moon?</h1>
          <p className="mt-4 text-[16px] text-mute">EmberAtlas shows what NASA&apos;s ISS fire experiments prove about cabin materials, where that proof stops, and simulates what lies beyond, so the next test is the right one.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <RunCta />
            <Link href="/evidence" className="btn" data-testid="cta-evidence">See the NASA evidence</Link>
          </div>
        </div>
        <figure className="border border-line bg-panel">
          {/* NASA's original image URL is kept intact for attribution and provenance. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={NASA_IMAGE} alt="A nearly spherical flame surrounds an acrylic sample inside the International Space Station's Combustion Integrated Rack." fetchPriority="high" className="block w-full" />
          <figcaption className="flex justify-between gap-2 p-2 text-[12px] text-faint"><span>SoFIE-GEL · Combustion Integrated Rack, ISS</span><a href={NASA_IMAGE_SOURCE} target="_blank" rel="noreferrer">Image: NASA / JSC ↗</a></figcaption>
        </figure>
      </section>

      <section className="mt-12 border border-line bg-panel p-5" aria-labelledby="maya-title">
        <h2 id="maya-title" className="label">Maya&apos;s question</h2>
        <ol className="mt-3 space-y-2 text-[15px]">
          <li><span className="text-faint">Before · </span>Maya approves cabin fabrics for a lunar habitat at {pct(lunarO2)} O₂ and {stops.mission.P_Pa / 1000} kPa, using an Earth-gravity burn test.</li>
          <li><span className="text-faint">With EmberAtlas · </span>she sees what NASA&apos;s ISS fire data proves, where it stops, and a simulation of the lunar cabin beyond it.</li>
          <li><span className="text-faint">After · </span>she knows which result is evidence, which is extrapolation, and which test to fly next.</li>
        </ol>
      </section>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <section className="border border-line bg-panel p-5" aria-labelledby="f1-title">
          <p className="label">Finding 1</p>
          <h2 id="f1-title" className="display mt-2 text-xl">Does the Earth test hold up in orbit?</h2>
          <p className="mt-3 text-[15px]" data-testid="landing-orbit-counts"><span className="num">{n}</span> like-for-like samples: <span className="num">{better}</span> less flammable in orbit, <span className="num">{same}</span> the same, <span className="num">{worse}</span> worse.</p>
          <p className="mt-3 text-[12px] text-faint">SAFFIRE-II, PSI-99, like-for-like samples, small n</p>
        </section>
        <section className="border border-line bg-panel p-5" aria-labelledby="f2-title">
          <p className="label">Finding 2</p>
          <h2 id="f2-title" className="display mt-2 text-xl">Where the evidence stops</h2>
          <p className="mt-3 text-[15px]">Highest O₂ at which any solid was burned in PSI: <span className="num">{maxSolid == null ? "no data" : pct(maxSolid)}</span>. The lunar habitat breathes <span className="num text-warn">{pct(lunarO2)}</span>.</p>
          <p className="mt-3 text-[12px] text-faint">{stops.bre_note}</p>
        </section>
        <section className="border border-line bg-panel p-5" aria-labelledby="f3-title">
          <p className="label">Finding 3</p>
          <h2 id="f3-title" className="display mt-2 text-xl">Simulate beyond it</h2>
          <p className="mt-3 text-[15px]">Every result past the tested envelope carries an EXTRAPOLATED badge, and the app proposes the next test to fly.</p>
          <div className="mt-4"><RunCta /></div>
        </section>
      </div>

      <section className="mt-8 border-t border-line pt-4 text-[13px] text-mute" aria-label="Trust and limits">
        <ul className="space-y-1">
          <li><span className="num">{psiRows.toLocaleString("en-US")}</span> PSI rows with provenance from <span className="num">{psiAccessions}</span> accessions</li>
          <li>FLEX cross-check against NTRS: <span className="num">{flex.mismatches.length}</span> mismatches in <span className="num">{flex.values_compared.toLocaleString("en-US")}</span> values</li>
          <li>Held-out FLEX burning-rate MAPE <span className="num">{flexMetrics.mape.toFixed(1)}%</span> (n = <span className="num">{flexMetrics.n}</span>)</li>
          <li>Not for flight certification. <Link href="/methods#limitations" className="underline">Limitations</Link></li>
        </ul>
      </section>
    </div>
  );
}
