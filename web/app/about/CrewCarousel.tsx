"use client";

import { useRef, useState, type ReactNode } from "react";

export function CrewCarousel({ names, children }: { names: string[]; children: ReactNode }) {
  const track = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState(0);

  function go(index: number) {
    const list = track.current;
    if (!list) return;
    const target = (index + names.length) % names.length;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    list.scrollTo({ left: list.clientWidth * target, behavior: reduced ? "instant" : "smooth" });
  }

  return (
    <section aria-labelledby="team-title" className="ea-crew card">
      <div className="ea-crew__header">
        <h2 id="team-title" className="display text-3xl">Meet the team</h2>
        <div className="flex items-center gap-2">
          <button className="btn" type="button" aria-label="Previous teammate" onClick={() => go(active - 1)}>←</button>
          <span className="num text-sm text-mute" aria-live="polite">{active + 1} / {names.length}</span>
          <button className="btn" type="button" aria-label="Next teammate" onClick={() => go(active + 1)}>→</button>
        </div>
      </div>
      <ul ref={track} className="ea-crew__track" tabIndex={0} aria-label="Team profiles"
        onScroll={(event) => {
          const list = event.currentTarget;
          setActive(Math.max(0, Math.min(names.length - 1, Math.round(list.scrollLeft / list.clientWidth))));
        }}
        onKeyDown={(event) => {
          if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
          event.preventDefault();
          go(active + (event.key === "ArrowRight" ? 1 : -1));
        }}>
        {children}
      </ul>
      <div className="ea-crew__names" role="group" aria-label="Choose a teammate">
        {names.map((name, index) => (
          <button key={name} className="btn" type="button" aria-pressed={active === index} onClick={() => go(index)}>{name}</button>
        ))}
      </div>
    </section>
  );
}
