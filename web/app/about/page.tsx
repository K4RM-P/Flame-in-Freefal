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
    name: "Karm Patel",
    initials: "KP",
    focus: "Project lead · Aerospace research · Atmospheric combustion",
    bio: "Karm leads EmberAtlas’s research direction, connecting NASA combustion evidence to transparent spacecraft fire-safety decisions and the simulator’s atmosphere and flame-spread questions.",
  },
  {
    name: "Anujan Akaljan",
    initials: "AA",
    focus: "Product and interaction design · Aerospace technology",
    bio: "Anujan shapes EmberAtlas’s interactive research experience, helping turn complex spacecraft fire evidence into clear tools for exploring scenarios and decisions.",
  },
  {
    name: "Aaron Sui",
    initials: "AS",
    focus: "Mechanical systems · Robotics · Prototyping",
    bio: "Aaron contributes hands-on systems and robotics thinking to EmberAtlas, helping shape practical fire-mitigation scenarios and the way engineering results are presented.",
  },
  {
    name: "Xuliang Sun",
    initials: "XS",
    focus: "Research support · Data and interface review",
    bio: "Xuliang supports the project’s research and review work, helping keep the evidence trail understandable and the experience coherent for new users.",
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
