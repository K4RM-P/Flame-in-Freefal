// SI-assisted: written with Codex (OpenAI); see README "Use of AI (SI)".
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "About" };
// Roles summarise each member's project contribution; personal and school details were removed in the upgrade.
const team: { name: string; initials: string; focus: string; bio: string; portrait?: string }[] = [
  { name: "Anujan Akaljan", initials: "AA", focus: "Software and simulation", bio: "Built the web app and the interactive simulation experience." },
  { name: "Karm Patel", initials: "KP", focus: "Combustion research", bio: "Led the combustion science: how oxygen, pressure and flow change how flames ignite and spread." },
  { name: "Aaron Sui", initials: "AS", focus: "Engineering and testing", bio: "Brought hands-on engineering to checking the cabin scenarios and the app." },
  { name: "Xuliang Sun", initials: "XS", focus: "Team member", bio: "Contributed to the EmberAtlas project." },
];

export default function About() {
  return (
    <article className="mx-auto max-w-5xl space-y-10 py-10 md:py-16">
      <header className="border-b border-line pb-8">
        <p className="label">NASA Space Apps · Flame in Freefall</p>
        <h1 className="display my-3 text-5xl md:text-7xl">About EmberAtlas</h1>
        <p className="measure text-lg leading-relaxed text-mute">We built EmberAtlas to make spacecraft fire research easier to explore, compare, and trace back to the experiments behind it.</p>
      </header>
      <section aria-labelledby="team-title">
        <h2 id="team-title" className="display mb-4 text-2xl">Meet the team</h2>
        <ul className="grid gap-4 sm:grid-cols-2">
          {team.map(({ name, initials, focus, bio, portrait }) => (
            <li key={name} className="card space-y-3 border-t-2 border-t-accent md:p-6">
              <div className="grid aspect-square w-24 place-items-center overflow-hidden rounded-lg border border-line bg-surface2 md:w-28" aria-hidden="true">
                {portrait
                  ? <img className="h-full w-full object-cover" src={portrait} alt="" loading="lazy" />
                  : <span className="num text-2xl text-mute">{initials}</span>}
              </div>
              <h3 className="display text-2xl">{name}</h3>
              <p className="label">{focus}</p>
              <p className="text-base leading-relaxed text-mute">{bio}</p>
            </li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="built-about" className="card space-y-3 md:p-8">
        <h2 id="built-about" className="display text-2xl">How we built it</h2>
        <p className="measure text-base leading-relaxed text-mute">Claude Code wrote the code under our direction and review. The OpenAI API powers the scenario builder, run interpretation and the experiment-match explanation, grounded on engine output and NASA PSI data. For equations, validation and data, see <Link className="underline underline-offset-4" href="/methods">Methods</Link>.</p>
      </section>
    </article>
  );
}
