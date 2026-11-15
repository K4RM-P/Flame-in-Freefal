// SI-assisted: written with Codex (OpenAI); see README "Use of AI (SI)".
import { existsSync } from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import Link from "next/link";
import { IdeaOrbit } from "./IdeaOrbit";
import { CrewCarousel } from "./CrewCarousel";
import { MissionLog } from "./MissionLog";

export const metadata: Metadata = { title: "About" };
const team: { name: string; initials: string; focus: string; bio: string }[] = [
  {
    name: "Anujan Akaljan",
    initials: "AA",
    focus: "Student developer · Team Ontario athlete · Aerospace technology",
    bio: "Anujan is a Grade 10 Pre-IB student at Milliken Mills High School. He represented Team Ontario at the U16 Ontario–Quebec Dual Meet and competed at OFSAA, with events spanning hurdles, jumps, and the pentathlon. He builds Orbit for youth program operations and Learnify for student assignments and progress tracking, co-created the FridgeOMeter science fair project, and coordinates youth programming with CFLI. He is exploring a potential Learnify integration with Knowledgehook to connect math practice, assignment feedback, and student progress. His aerospace interests include interactive simulations and AI tools that help people understand how spacecraft crews make decisions under pressure.",
  },
  {
    name: "Karm Patel",
    initials: "KP",
    focus: "Aerospace research · Atmospheric combustion · Fire prevention",
    bio: "Karm’s aerospace research and engineering work explores how atmospheric conditions affect combustion and flame behavior. His work on fire and flame prevention connects the physics of how flames ignite and spread with practical engineering approaches to controlling them.",
  },
  {
    name: "Aaron Sui",
    initials: "AS",
    focus: "Competitive runner · Student inventor · Robotics",
    bio: "Aaron is a Grade 10 Pre-IB student at Milliken Mills High School who competed at OFSAA Cross Country in 2026. He co-created FridgeOMeter, which earned multiple awards at the 2026 York Region Science and Technology Fair. He brings hands-on mechanical experience from VEX Robotics and the FIRST Robotics Competition, where he actively contributes to building and refining robot mechanisms.",
  },
  {
    name: "Xuliang Sun",
    initials: "XS",
    focus: "Grade 10 Pre-IB · Milliken Mills High School",
    bio: "Xuliang is a Grade 10 Pre-IB student at Milliken Mills High School and a member of the EmberAtlas team.",
  },
];

export default function About() {
  return (
    <article className="ea-about mx-auto max-w-6xl space-y-10 py-8 md:py-12">
      <header className="ea-research-hero ea-about__hero ea-mission-hero">
        <p className="label">NASA Space Apps · Flame in Freefall</p>
        <h1 className="display my-3 text-5xl md:text-7xl">Inside EmberAtlas</h1>
        <p className="measure text-lg leading-relaxed text-mute">We built EmberAtlas to make spacecraft fire research easier to explore, compare, and trace back to the experiments behind it.</p>
        <nav className="ea-jumps mt-5" aria-label="About sections">
          <a href="#idea-orbit">Questions</a><a href="#compare-views">Try both views</a><a href="#team-title">Team</a><a href="#built-about">How we built it</a>
        </nav>
        <div id="idea-orbit"><IdeaOrbit /></div>
      </header>
      <MissionLog />
      <CrewCarousel names={team.map(({ name }) => name)}>
        {team.map(({ name, initials, focus, bio }) => {
          const portrait = `/team/${name.toLowerCase().replaceAll(" ", "-")}.jpg`;
          const hasPortrait = existsSync(path.join(process.cwd(), "public", portrait));
          return (
            <li key={name} className="ea-crew__slide">
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
      <section aria-labelledby="built-about" className="card space-y-3 md:p-8">
        <h2 id="built-about" className="display text-2xl">How we built it</h2>
        <dl className="ea-build-list">
          <div><dt>Code and review</dt><dd>Our team combined human-written code with Claude Code. We wrote and reviewed code, worked through design decisions, and tested the results together.</dd></div>
          <div><dt>Scenario builder</dt><dd>The OpenAI API turns a plain-language description into draft inputs you can review.</dd></div>
          <div><dt>Aster research chat</dt><dd>Aster searches the bundled NASA study catalog. When OpenAI is available, it summarizes matching records. Catalog excerpts and source links are available in either mode.</dd></div>
        </dl>
        <Link className="ea-source-link inline-block underline underline-offset-4" href="/methods">Explore the methods and validation</Link>
      </section>
    </article>
  );
}
