"use client";

import { useRef, useState, type ReactNode } from "react";

export function CrewCarousel({ team, children }: { team: { name: string; initials: string }[]; children: ReactNode }) {
  const track = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState(0);

  function go(index: number) {
    const list = track.current;
    if (!list) return;
    const target = (index + team.length) % team.length;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    list.scrollTo({ left: list.clientWidth * target, behavior: reduced ? "instant" : "smooth" });
  }

  return (
    <section aria-labelledby="team-title" className="ea-crew card">
      <div className="ea-crew__header">
        <div>
          <h2 id="team-title" className="display text-3xl">Meet the team</h2>
          <p className="mt-2 border-l-2 border-line pl-3 text-sm italic text-mute">
            “Ask better questions before launch.”
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn" type="button" aria-label="Previous teammate" onClick={() => go(active - 1)}>←</button>
          <span className="num text-sm text-mute" aria-live="polite">{active + 1} / {team.length}</span>
          <button className="btn" type="button" aria-label="Next teammate" onClick={() => go(active + 1)}>→</button>
        </div>
      </div>
      <div className="ea-cabin">
        <div className="ea-cabin__caption">
          <span className="num">EmberAtlas / Crew module</span>
          <span>NASA Space Apps · Flame in Freefall</span>
        </div>
        <p className="ea-cabin__hint">Choose a crew member to open their profile.</p>
        <div className="ea-cabin__hull" role="group" aria-label="Crew cabin stations">
          {team.map(({ name, initials }, index) => (
            <button key={name} className="ea-cabin__station" type="button" aria-pressed={active === index}
              aria-controls={`crew-${initials.toLowerCase()}`} onClick={() => go(index)}>
              <span className="ea-cabin__helmet" aria-hidden="true"><span className="num">{initials}</span></span>
              <span className="ea-cabin__name">{name}</span>
            </button>
          ))}
        </div>
      </div>
      <ul ref={track} className="ea-crew__track" tabIndex={0} aria-label="Team profiles"
        onScroll={(event) => {
          const list = event.currentTarget;
          setActive(Math.max(0, Math.min(team.length - 1, Math.round(list.scrollLeft / list.clientWidth))));
        }}
        onKeyDown={(event) => {
          if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
          event.preventDefault();
          go(active + (event.key === "ArrowRight" ? 1 : -1));
        }}>
        {children}
      </ul>
    </section>
  );
}
