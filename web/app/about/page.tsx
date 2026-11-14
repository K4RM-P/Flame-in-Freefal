import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "About" };
const team = ["Anujan Akaljan", "Karm Patel", "Aaron Sui", "Xuliang Sun"];

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
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {team.map((name) => <li key={name} className="card border-t-2 border-t-accent text-base font-semibold">{name}</li>)}
        </ul>
      </section>
      <section aria-labelledby="aster-about" className="card space-y-3 md:p-8">
        <h2 id="aster-about" className="display text-2xl">How we built Aster</h2>
        <p className="measure text-base leading-relaxed text-mute">We built Aster as a research companion. In its current local mode, it matches words in your question against the titles and descriptions in EmberAtlas’s bundled NASA Physical Sciences Informatics catalog. It shows the closest studies with their original objectives and source links.</p>
        <p className="measure text-base leading-relaxed text-mute">Aster runs this search without an OpenAI key. For equations, validation results, and how NASA data feeds the simulator, see <Link className="underline underline-offset-4" href="/methods">Methods &amp; Validation</Link>.</p>
      </section>
    </article>
  );
}
