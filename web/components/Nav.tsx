import Link from "next/link";

const LINKS = [
  ["/", "Brief"], ["/console", "Console"], ["/models/spread", "Models"], ["/validation", "Validation Lab"], ["/evidence", "Evidence"],
  ["/gaps", "Gaps"], ["/implications", "Implications"], ["/earth", "Earth"], ["/ask", "Ask"], ["/methods", "Methods"],
] as const;

export function Nav() {
  return (
    <header className="border-b border-line">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-5 gap-y-1 px-4 py-2">
        <Link href="/" className="flex items-center gap-2 font-semibold"><span className="text-accent">▲</span>EmberAtlas</Link>
        <nav className="flex flex-wrap gap-x-4 text-sm text-mute">
          {LINKS.map(([href, label]) => <Link key={href} href={href} className="hover:text-ink">{label}</Link>)}
        </nav>
      </div>
    </header>
  );
}

export function Caveat() {
  return (
    <div className="rounded-md border border-blue/40 bg-blue/10 px-3 py-2 text-xs text-blue" role="note">
      PSI contains microgravity and 1 g data only; partial-gravity values are bounded estimates.
    </div>
  );
}
