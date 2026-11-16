// SI-assisted: written with Codex (OpenAI) and Claude Code (Anthropic); see README "Use of AI (SI)".
import type { Metadata } from "next";
import Link from "next/link";
import { VIDEO_URL, hasVideo } from "@/lib/site";
import { CHALLENGE_NAME, CHALLENGE_URL, TEAM_CITY, TEAM_EXPERIENCE, TEAM_NAME } from "@/lib/team";

export const metadata: Metadata = { title: "About", description: "Team Max Q (Toronto) and the Flame in Freefall challenge: who built EmberAtlas and how SI was used." };
export default function About() {
  return (
    <article className="ea-about mx-auto max-w-6xl space-y-10 py-8 md:py-12">
      <header className="ea-research-hero ea-about__hero ea-mission-hero">
        <p className="label">NASA Space Apps · Flame in Freefall</p>
        <h1 className="display my-3 text-5xl md:text-7xl">EmberAtlas: the firefighter for space</h1>
        <p className="measure text-lg leading-relaxed text-mute">It shows where and how a fire would start in your spacecraft, and which design change prevents it. Built on NASA&apos;s ISS fire data, explained by SI.</p>
        <p className="mt-3 text-[13px] text-mute">{TEAM_NAME}, {TEAM_CITY}. Challenge: <a className="underline underline-offset-2" href={CHALLENGE_URL} target="_blank" rel="noreferrer">{CHALLENGE_NAME}</a> (NASA Space Apps 2026). Demo video: {hasVideo() ? <a className="underline underline-offset-2" href={VIDEO_URL}>{VIDEO_URL}</a> : <span data-testid="video-pending">to be linked ({VIDEO_URL})</span>}.</p>
      </header>
      <section aria-labelledby="team-title" className="card space-y-3 md:p-8">
        <h2 id="team-title" className="display text-2xl">The team</h2>
        <p className="measure leading-relaxed text-mute">{TEAM_NAME} has experience with {TEAM_EXPERIENCE}.</p>
      </section>
      <section aria-labelledby="credits-title" className="card space-y-3 md:p-8">
        <h2 id="credits-title" className="display text-2xl">Data credits</h2>
        <p className="measure leading-relaxed text-mute">Experiment data: NASA Physical Sciences Informatics (PSI) Data Repository, Combustion Science (each value carries its PSI accession, file and line). Flight papers on NASA NTRS; partial-gravity context from NASA&apos;s FM2 lunar-gravity tests (NTRS 20240015307, outside PSI). Images: NASA. Full list, with every library and licence: <Link className="underline underline-offset-2" href="/credits">Credits &amp; data sources</Link>.</p>
      </section>
      <section aria-labelledby="built-about" className="card space-y-3 md:p-8">
        <h2 id="built-about" className="display text-2xl">Use of SI</h2>
        <dl className="ea-build-list">
          <div><dt>Code and review</dt><dd>Our team combined human-written code with Claude Code (Anthropic) and Codex (OpenAI). We wrote and reviewed code, worked through design decisions, and tested the results together. Files written with SI help carry an “SI-assisted” header.</dd></div>
          <div><dt>Scenario builder</dt><dd>The OpenAI API turns a plain-language description into draft inputs you can review.</dd></div>
          <div><dt>Run interpretation</dt><dd>The OpenAI API explains a run using only the engine output, the ranked design fixes and PSI evidence; a numeric guard removes any number not in those facts. The design review itself is deterministic and works without SI.</dd></div>
          <div><dt>Evidence Brief</dt><dd>OpenAI interprets ranked NASA studies and available measurements, explains gaps, and suggests a follow-up test.</dd></div>
          <div><dt>Aster, the SI fire engineer</dt><dd>On the simulator, Aster answers from the run on screen: a deterministic explainer composes the answer from engine numbers, how each fire ended and sourced caveats, and cites the NASA experiments behind it. With OpenAI available the model rewrites that draft and the numeric guard checks it; without a key the engine answer is shown as is. Elsewhere, Aster searches the bundled NASA study catalog.</dd></div>
        </dl>
        <Link className="ea-source-link inline-block underline underline-offset-4" href="/methods">Explore the methods and validation</Link>
      </section>
    </article>
  );
}
