// SI-assisted: written with Codex (OpenAI); see README "Use of AI (SI)".
import { existsSync } from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import Link from "next/link";

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
    <article className="mx-auto max-w-5xl space-y-10 py-10 md:py-16">
      <header className="rounded-xl border border-line bg-panel p-6 md:p-12">
        <p className="label">NASA Space Apps · Flame in Freefall</p>
        <h1 className="serif my-3 text-5xl md:text-7xl">About EmberAtlas</h1>
        <p className="measure text-lg leading-relaxed text-mute">We built EmberAtlas to make spacecraft fire research easier to explore, compare, and trace back to the experiments behind it.</p>
      </header>
      <section aria-labelledby="team-title">
        <h2 id="team-title" className="display mb-4 text-2xl">Meet the team</h2>
        <ul className="grid gap-4 sm:grid-cols-2">
          {team.map(({ name, initials, focus, bio }) => {
            const portrait = `/team/${name.toLowerCase().replaceAll(" ", "-")}.jpg`;
            const hasPortrait = existsSync(path.join(process.cwd(), "public", portrait));
            return (
            <li key={name} className="card space-y-3 border-t-2 border-t-accent md:p-7">
              <div className="grid aspect-square w-32 place-items-center overflow-hidden rounded-lg border border-line bg-surface2 md:w-36" aria-hidden="true">
                {hasPortrait
                  ? <img className="h-full w-full object-cover" src={portrait} alt="" loading="lazy" />
                  : <span className="num text-2xl text-mute">{initials}</span>}
              </div>
              <h3 className="display text-2xl">{name}</h3>
              <p className="label">{focus}</p>
              <p className="text-base leading-relaxed text-mute">{bio}</p>
            </li>
            );
          })}
        </ul>
      </section>
      <section aria-labelledby="built-about" className="card space-y-3 md:p-8">
        <h2 id="built-about" className="display text-2xl">How we built it</h2>
        <p className="measure text-base leading-relaxed text-mute">Our team combined human-written code with Claude Code. We wrote and reviewed code, worked through design decisions, and tested the results together.</p>
        <p className="measure text-base leading-relaxed text-mute">The OpenAI API powers the scenario builder, which turns a plain-language description into draft inputs you can review.</p>
        <p className="measure text-base leading-relaxed text-mute"><strong className="text-ink">Aster</strong> is our research chatbot. It searches EmberAtlas’s bundled NASA study catalog and returns relevant study excerpts with source links. Open Ask Aster in the bottom-right corner to try it.</p>
        <Link className="underline underline-offset-4" href="/methods">Explore the methods and validation</Link>
      </section>
    </article>
  );
}
