// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Live demo, findings, NASA data marquee, trust table, final CTA and footer. Every number is a prop from lib/landing/facts.
import { CHALLENGE_NAME, CHALLENGE_URL, TEAM_CITY, TEAM_NAME } from "@/lib/team";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo, REPO_URL } from "@/components/shell/brand";
import { sig } from "@/lib/ui/format";
import type { LandingFacts } from "@/lib/landing/facts";
import { Reveal } from "./motion";
const stagger = (i: number) => i * 0.06; // 60 ms reveal stagger
import { Stat } from "./Stat";

const RUN = "/simulator?preset=iss-vs-lunar&run=1";
const pct = (x: number) => `${sig(x * 100, 3)}%`;

export function LiveDemo({ run, video }: { run: LandingFacts["run"]; video: boolean }) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-28 md:px-6" aria-labelledby="demo-title">
      <Reveal className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="ea-meta">Live demo</p><h2 id="demo-title" className="mt-3 text-[36px] font-semibold leading-[1.05] tracking-[-0.04em] md:text-[56px]">The same fabric, two cabins.</h2></div>
        <Button asChild variant="secondary"><Link href={RUN}>Open in simulator <ArrowRight strokeWidth={1.5} /></Link></Button>
      </Reveal>
      <Reveal className="mt-10">
        <figure className="relative overflow-hidden rounded-[12px] border border-line bg-panel">
          <div className="flex items-center gap-2 border-b border-line px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.06em] text-faint">
            <span className="h-2 w-2 rounded-full bg-ember" aria-hidden />simulator · iss-vs-lunar<span className="ml-auto">{video ? "screen recording" : "3D render · our simulator"}</span>
          </div>
          <div className="relative aspect-[16/10] w-full bg-bg">
            {video
              ? <video className="absolute inset-0 h-full w-full object-cover" src="/media/demo.mp4" autoPlay muted loop playsInline preload="none" poster="/media/sim-3d.webp" aria-label="Screen recording of the EmberAtlas simulator" />
              // eslint-disable-next-line @next/next/no-img-element
              : <img className="absolute inset-0 h-full w-full object-cover" src="/media/sim-3d.webp" alt="EmberAtlas 3D simulator: overview of a cabin module with a burning fabric sample" width={1440} height={900} loading="lazy" decoding="async" />}
            {run && <div className="absolute inset-x-3 bottom-3 flex flex-wrap gap-2" data-testid="demo-chips">
              <span className="ea-pill bg-panel/90 backdrop-blur">Burnout · {run.aName} <b className="num text-ink">{sig(run.burnA, 3)} {run.units}</b></span>
              <span className="ea-pill bg-panel/90 backdrop-blur">{run.bName} <b className="num text-ink">{sig(run.burnB, 3)} {run.units}</b></span>
              {run.ratio != null && <span className="ea-pill bg-panel/90 backdrop-blur" data-tone="ember"><b className="num">{sig(run.ratio, 2)}×</b> {run.faster ? "faster" : "slower"}</span>}
              {run.extrapolated.length > 0 && <span className="ea-pill bg-panel/90 backdrop-blur" data-tone="warn" title={run.extrapolated.join(" · ")}>Extrapolated</span>}
            </div>}
          </div>
        </figure>
      </Reveal>
    </section>
  );
}

export function Findings({ f }: { f: LandingFacts }) {
  const o = f.orbit, s = f.stops, r = f.run;
  return (
    <section className="border-y border-line bg-panel" aria-labelledby="findings-title">
      <div className="mx-auto max-w-6xl px-4 py-24 md:px-6">
        <Reveal><p className="ea-meta">Findings</p><h2 id="findings-title" className="mt-3 text-[36px] font-semibold leading-[1.05] tracking-[-0.04em] md:text-[56px]">What NASA&apos;s data says.</h2></Reveal>
        <div className="mt-12 grid gap-px overflow-hidden rounded-[12px] border border-line bg-line md:grid-cols-3">
          <Reveal delay={stagger(0)} className="bg-bg p-6 md:p-8">
            <p className="ea-meta">Earth test vs orbit</p>
            <p className="mt-4 flex items-baseline gap-2 text-[48px] font-semibold tracking-[-0.04em]" data-testid="landing-orbit-counts">
              <Stat value={o.better} /><span className="text-faint">/</span><Stat value={o.same} /><span className="text-faint">/</span><Stat value={o.worse} />
            </p>
            <p className="mt-2 text-[14px] text-mute"><span className="num">{o.n}</span> like-for-like samples: less flammable in orbit / same / worse. Small n.</p>
            <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.06em] text-faint">PSI-99 · SAFFIRE-II</p>
          </Reveal>
          <Reveal delay={stagger(1)} className="bg-bg p-6 md:p-8">
            <p className="ea-meta">Highest solid O₂ tested</p>
            <p className="mt-4 flex items-baseline gap-2 text-[48px] font-semibold tracking-[-0.04em]">{s.maxSolid == null ? "∅" : <Stat value={s.maxSolid * 100} digits={3} suffix="%" />}<span className="text-[20px] text-faint">vs</span><span className="num text-[28px] text-ember-text">{pct(s.mission)}</span></p>
            <p className="mt-2 text-[14px] text-mute">Moon-base air is beyond every solid burned in PSI.</p>
            <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.06em] text-faint">PSI materials index · ACME BRE PSI-20</p>
          </Reveal>
          <Reveal delay={stagger(2)} className="bg-bg p-6 md:p-8">
            <p className="ea-meta">Moon-base burnout</p>
            <p className="mt-4 text-[48px] font-semibold tracking-[-0.04em] text-ember-text">{r?.ratio == null ? "∅" : <Stat value={r.ratio} digits={2} suffix="×" />}</p>
            <p className="mt-2 text-[14px] text-mute">{r ? <>{r.bName} burns out {r.faster ? "faster" : "slower"} than {r.aName}: <span className="num">{sig(r.burnB, 3)}</span> vs <span className="num">{sig(r.burnA, 3)} {r.units}</span>. <span className="ea-pill ml-1 align-middle" data-tone="warn">Extrapolated</span></> : "No engine result"}</p>
            <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.06em] text-faint">Engine · PSI-98 SAFFIRE-I fabric · seed-fixed MC</p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

export function Marquee({ chips }: { chips: LandingFacts["psi"]["chips"] }) {
  const row = chips.map((c) => (
    <Link key={c.accession} href={`/evidence#${c.accession.toLowerCase()}`} className="ea-pill mx-1.5 h-8 shrink-0 px-3 text-[12px] hover:border-ember/50 hover:text-ink">
      <span className="text-ember-text">{c.accession}</span> {c.name}
    </Link>
  ));
  return (
    <section className="overflow-hidden py-16" aria-label="NASA PSI datasets used">
      <p className="mx-auto mb-6 max-w-6xl px-4 ea-meta md:px-6">NASA PSI datasets in EmberAtlas · <span className="num">{chips.length}</span></p>
      <div className="group relative [mask-image:linear-gradient(90deg,transparent,#000_10%,#000_90%,transparent)]">
        <div className="flex w-max animate-marquee group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused]">
          <div className="flex">{row}</div><div className="flex" aria-hidden>{row}</div>
        </div>
      </div>
    </section>
  );
}

export function Trust({ f, pass, total }: { f: LandingFacts; pass: number; total: number }) {
  const rows: [string, React.ReactNode, string][] = [
    ["FLEX cross-check vs NTRS", <><span className="num">{f.flex.mismatches}</span> mismatches in <span className="num">{f.flex.compared.toLocaleString("en-US")}</span> values</>, "PSI-69 · NTRS"],
    ["Held-out droplet burning rate", <>MAPE <span className="num">{sig(f.flex.mape, 3)}%</span> (n = <span className="num">{f.flex.n}</span>)</>, "PSI-69 FLEX · test split"],
    ["SIBAL flame-spread error", f.spread.mape == null ? "No data" : <><span className="num">{sig(f.spread.mape, 3)}%</span> (n = <span className="num">{f.spread.n}</span>, a single held-out flight test)</>, "PSI-98/100 SAFFIRE"],
    ["Published validation targets", <><span className="num">{pass}</span> of <span className="num">{total}</span> pass; failures are shown, not hidden</>, "data/validation/summary.json"],
    ["Limitations", <>Partial gravity is an estimate (µg ↔ 1 g) that may be non-conservative (NASA FM2). Not for flight certification. <Link href="/methods#limitations" className="text-ember-text underline-offset-4 hover:underline">Read the limits</Link></>, "Methods"],
  ];
  return (
    <section className="mx-auto max-w-6xl px-4 py-24 md:px-6" aria-labelledby="trust-title">
      <Reveal><p className="ea-meta">Trust</p><h2 id="trust-title" className="mt-3 text-[36px] font-semibold leading-[1.05] tracking-[-0.04em] md:text-[56px]">Checked, and honest about it.</h2></Reveal>
      <Reveal className="mt-10 overflow-x-auto rounded-[12px] border border-line">
        <table className="w-full min-w-[40rem] text-left text-[14px]">
          <thead><tr className="border-b border-line">{["Check", "Result", "Source"].map((h) => <th key={h} className="px-4 py-3 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-faint">{h}</th>)}</tr></thead>
          <tbody>{rows.map(([k, v, src]) => <tr key={k} className="border-b border-line last:border-0 hover:bg-panel"><td className="px-4 py-3 font-medium">{k}</td><td className="px-4 py-3 text-mute">{v}</td><td className="px-4 py-3 font-mono text-[11px] uppercase tracking-[0.06em] text-faint">{src}</td></tr>)}</tbody>
        </table>
      </Reveal>
    </section>
  );
}

export function FinalCta() {
  return (
    <section className="relative overflow-hidden border-t border-line" aria-labelledby="cta-title">
      <div className="ea-glow pointer-events-none absolute inset-0" aria-hidden /><div className="ea-grid pointer-events-none absolute inset-0" aria-hidden />
      <Reveal className="relative mx-auto flex max-w-4xl flex-col items-center px-4 py-32 text-center md:px-6">
        <h2 id="cta-title" className="text-[36px] font-semibold leading-[1.02] tracking-[-0.04em] md:text-[64px]">Know where a fire would start before anyone launches.</h2>
        <Button asChild size="lg" className="mt-10 px-6 text-[15px] font-semibold"><Link href={RUN}>Run the Moon-base fire <ArrowRight strokeWidth={1.5} /></Link></Button>
      </Reveal>
    </section>
  );
}

export function LandingFooter() {
  return (
    <footer className="border-t border-line" data-noprint>
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 text-[13px] md:grid-cols-4 md:px-6">
        <div className="space-y-3"><Logo /><p className="text-mute">The firefighter for space.</p></div>
        <div className="space-y-2"><p className="ea-meta">Product</p><ul className="space-y-1.5 text-mute">
          <li><Link className="hover:text-ink" href="/simulator">Simulator</Link></li><li><Link className="hover:text-ink" href="/evidence">Evidence</Link></li><li><Link className="hover:text-ink" href="/methods">Methods</Link></li></ul></div>
        <div className="space-y-2"><p className="ea-meta">Team</p><ul className="space-y-1.5 text-mute">
          <li><Link className="hover:text-ink" href="/about">About EmberAtlas</Link></li><li><Link className="hover:text-ink" href="/credits">Credits &amp; data sources</Link></li><li><a className="hover:text-ink" href={REPO_URL} target="_blank" rel="noreferrer">GitHub</a></li>
          <li><a className="hover:text-ink" href={`${REPO_URL}#use-of-ai-si`} target="_blank" rel="noreferrer">Use of SI</a></li></ul></div>
        <div className="space-y-2"><p className="ea-meta">Data credits</p><p className="text-mute">NASA Physical Sciences Informatics (PSI) Data Repository: Combustion Science. NASA imagery is public domain; no NASA endorsement implied.</p></div>
      </div>
      <p className="mx-auto max-w-6xl border-t border-line px-4 py-4 font-mono text-[11px] uppercase tracking-[0.06em] text-faint md:px-6">{TEAM_NAME} · {TEAM_CITY} · <a className="hover:text-ink" href={CHALLENGE_URL} target="_blank" rel="noreferrer">NASA Space Apps 2026 · {CHALLENGE_NAME}</a> · Not for flight certification</p>
    </footer>
  );
}
