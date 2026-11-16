// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
import Link from "next/link";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <section className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-start justify-center gap-4 py-16">
      <p className="label">404</p>
      <h1 className="display text-4xl leading-[1.05]">Nothing to catch fire here.</h1>
      <p className="text-mute">This page does not exist. The simulator, the NASA evidence and the methods are one click away.</p>
      <div className="flex flex-wrap gap-2"><Link className="btn-accent" href="/simulator">Try the simulator</Link><Link className="btn" href="/evidence">NASA evidence</Link><Link className="btn" href="/">Home</Link></div>
    </section>
  );
}
