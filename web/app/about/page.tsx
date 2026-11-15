// SI-assisted: written with Codex (OpenAI) and Claude Code (Anthropic); see README "Use of AI (SI)".
import { CrewCarousel } from "./CrewCarousel";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "About" };
const team = [
  {
    name: "Aaron",
    initials: "AS",
    focus: "Mechanical engineering · Prototyping",
    bio: "Aaron is interested in mechanical engineering and how testing helps turn early prototypes into reliable hardware. For EmberAtlas, he helps explain how an engineer can use the evidence to decide which fire-safety questions to test first.",
  },
  {
    name: "Anujan",
    initials: "AA",
    focus: "Applied science · Interface design",
    bio: "Anujan helped build tools for exploring NASA’s combustion research. He’s interested in how oxygen, pressure, and airflow shape modeled cabin fires and how simulations can help identify which predictions need an experiment.",
  },
  {
    name: "Karm",
    initials: "KP",
    focus: "Combustion · Spacecraft fire safety",
    bio: "Karm is interested in how atmospheric conditions affect ignition and flame spread. For EmberAtlas, he helps explain the simulation and how combustion experiments can inform material choices and fire prevention for spacecraft.",
  },
  {
    name: "Xuliang",
    initials: "XS",
    focus: "Space exploration · Research communication",
    bio: "Xuliang is interested in how experiments in orbit can guide the design of lunar and Martian habitats. For EmberAtlas, he helps explain what the project can validate today and how a future research partner could plan the next test.",
  },
];

export default function About() {
  return (
    <article className="ea-about mx-auto max-w-6xl space-y-10 py-8 md:py-12">
      <header className="ea-research-hero ea-about__hero ea-mission-hero">
        <p className="label">NASA Space Apps · Flame in Freefall</p>
        <h1 className="display my-3 text-5xl md:text-7xl">EmberAtlas: the firefighter for space</h1>
        <p className="measure text-lg leading-relaxed text-mute">It shows where and how a fire would start in your spacecraft, and which design change prevents it. Built on NASA&apos;s ISS fire data, explained by AI.</p>
      </header>
      <CrewCarousel team={team}>
        {team.map(({ name, initials, focus, bio }) => (
            <li key={name} id={`crew-${initials.toLowerCase()}`} className="ea-crew__slide">
              <div className="ea-crew__portrait" aria-hidden="true">
                <span className="num">{initials}</span>
              </div>
              <div className="ea-crew__bio">
                <p className="label">{focus}</p>
                <h3 className="display my-2 text-3xl md:text-4xl">{name}</h3>
                <p className="measure leading-relaxed text-mute">{bio}</p>
              </div>
            </li>
        ))}
      </CrewCarousel>
      <section aria-labelledby="credits-title" className="card space-y-3 md:p-8">
        <h2 id="credits-title" className="display text-2xl">Data credits</h2>
        <p className="measure leading-relaxed text-mute">Experiment data: NASA Physical Sciences Informatics (PSI) Data Repository, Combustion Science (each value carries its PSI accession, file and line). Flight papers on NASA NTRS; partial-gravity context from NASA&apos;s FM2 lunar-gravity tests (NTRS 20240015307, outside PSI). Images: NASA. Full list in <code>CREDITS.md</code> and <code>docs/REFERENCES.json</code>.</p>
      </section>
      <section aria-labelledby="built-about" className="card space-y-3 md:p-8">
        <h2 id="built-about" className="display text-2xl">Use of AI</h2>
        <dl className="ea-build-list">
          <div><dt>Code and review</dt><dd>Our team combined human-written code with Claude Code (Anthropic). We wrote and reviewed code, worked through design decisions, and tested the results together.</dd></div>
          <div><dt>Scenario builder</dt><dd>The OpenAI API turns a plain-language description into draft inputs you can review.</dd></div>
          <div><dt>Run interpretation</dt><dd>The OpenAI API explains a run using only the engine output, the ranked design fixes and PSI evidence; a numeric guard removes any number not in those facts. The design review itself is deterministic and works without AI.</dd></div>
          <div><dt>Evidence Brief</dt><dd>OpenAI interprets ranked NASA studies and available measurements, explains gaps, and suggests a follow-up test.</dd></div>
          <div><dt>Aster research chat</dt><dd>Aster searches the bundled NASA study catalog. When OpenAI is available, it summarizes matching records. Catalog excerpts and source links are available in either mode.</dd></div>
        </dl>
        <Link className="ea-source-link inline-block underline underline-offset-4" href="/methods">Explore the methods and validation</Link>
      </section>
    </article>
  );
}
