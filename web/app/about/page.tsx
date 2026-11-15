// SI-assisted: written with Codex (OpenAI) and Claude Code (Anthropic); see README "Use of AI (SI)".
import { existsSync } from "node:fs";
import path from "node:path";
import { CrewCarousel } from "./CrewCarousel";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "About" };
const team: { name: string; initials: string; focus: string; bio: string }[] = [
  {
    name: "Aaron Sui",
    initials: "AS",
    focus: "Competitive runner · Student inventor · Robotics",
    bio: "Aaron is a Grade 10 Pre-IB student at Milliken Mills High School who competed at OFSAA Cross Country in 2026. He co-created FridgeOMeter, which earned multiple awards at the 2026 York Region Science and Technology Fair. He brings hands-on mechanical experience from VEX Robotics and the FIRST Robotics Competition, where he actively contributes to building and refining robot mechanisms. He is interested in mechanical engineering and in how testing and iteration turn early prototypes into hardware that works reliably. Spacecraft systems are one area where he’d like to apply that hands-on approach.",
  },
  {
    name: "Anujan Akaljan",
    initials: "AA",
    focus: "Applied science · Student developer · Team Ontario athlete",
    bio: "Anujan is a Grade 10 Pre-IB student at Milliken Mills High School. He represented Team Ontario at the U16 Ontario–Quebec Dual Meet and competed at OFSAA, with events spanning hurdles, jumps, and the pentathlon. He co-created FridgeOMeter, a science fair project that earned multiple awards at the 2026 York Region Science and Technology Fair. That project and EmberAtlas reflect his interest in using software to make measurements and scientific results easier to interpret. He builds Orbit for youth program operations and Learnify for student assignments and progress tracking, and coordinates youth programming with CFLI. He is exploring a potential Learnify integration with Knowledgehook to connect math practice, assignment feedback, and student progress. For EmberAtlas, he helped build ways to explore NASA’s combustion research through interactive simulations and AI-guided questions. He is interested in how changing oxygen, pressure, or airflow affects a modeled cabin fire, and how the simulator can help a researcher identify which predictions need new experiments.",
  },
  {
    name: "Karm Patel",
    initials: "KP",
    focus: "Aerospace research · Atmospheric combustion · Fire prevention",
    bio: "Karm is a Grade 10 Pre-IB student at Milliken Mills High School. His aerospace research and engineering work explores how atmospheric conditions affect combustion and flame behavior. His work on fire and flame prevention connects the physics of how flames ignite and spread with practical engineering approaches to controlling them. He is interested in how fire experiments can inform material choices and prevention strategies for future crewed spacecraft and habitats. He approaches spacecraft safety through the conditions that change a flame’s behavior, including oxygen and airflow.",
  },
  {
    name: "Xuliang Sun",
    initials: "XS",
    focus: "Grade 10 Pre-IB · Milliken Mills High School · Space exploration",
    bio: "Xuliang is a Grade 10 Pre-IB student at Milliken Mills High School and a member of the EmberAtlas team. He is interested in space exploration and the engineering challenges of keeping people safe in habitats far from Earth. He is especially curious about how experiments in orbit can guide the design of future lunar and Martian habitats, and how clear visual explanations can make that research easier to understand.",
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
        {team.map(({ name, initials, focus, bio }) => {
          const portrait = `/team/${name.toLowerCase().replaceAll(" ", "-")}.jpg`;
          const hasPortrait = existsSync(path.join(process.cwd(), "public", portrait));
          return (
            <li key={name} id={`crew-${initials.toLowerCase()}`} className="ea-crew__slide">
              <div className="ea-crew__portrait" aria-hidden="true">
                {hasPortrait
                  ? <img className="h-full w-full object-cover" src={portrait} alt="" loading="lazy" />
                  : <span className="num">{initials}</span>}
              </div>
              <div className="ea-crew__bio">
                <p className="label">{focus}</p>
                <h3 className="display my-2 text-3xl md:text-4xl">{name}</h3>
                <p className="measure leading-relaxed text-mute">{bio}</p>
              </div>
            </li>
          );
        })}
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
