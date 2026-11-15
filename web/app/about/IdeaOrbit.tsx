"use client";

import Link from "next/link";
import { useState } from "react";

const ideas = [
  { label: "Compare", title: "What changes when fire leaves Earth?", copy: "We put matched Saffire-II samples side by side so visitors can compare the outcomes on Earth and in orbit and see the conditions behind them.", href: "/evidence#earth-vs-orbit", action: "Compare the tests" },
  { label: "Question", title: "Where does the evidence run out?", copy: "We show NASA’s tested ranges beside the lunar cabin inputs so visitors can spot which conditions still need an experiment.", href: "/evidence#where-evidence-stops", action: "Explore test coverage" },
  { label: "Trace", title: "Can the sources travel with the answer?", copy: "We built Aster to find relevant NASA records and keep their source links attached to its replies.", href: "#built-about", action: "See how Aster works" },
];

export function IdeaOrbit() {
  const [selected, setSelected] = useState(0);
  const [visited, setVisited] = useState([0]);
  const idea = ideas[selected];

  return (
    <section className="ea-idea-orbit" aria-label="Ideas behind EmberAtlas">
      <div className="ea-idea-map" role="group" aria-label="Choose an idea">
        <div className="ea-idea-map__ring" aria-hidden="true" />
        <div className="ea-idea-map__core" aria-hidden="true"><span>✦</span></div>
        {ideas.map(({ label }, index) => (
          <button key={label} type="button" className="ea-idea-node" data-position={index}
            aria-pressed={selected === index} aria-controls="ea-idea-detail"
            onClick={() => { setSelected(index); setVisited((current) => current.includes(index) ? current : [...current, index]); }}>
            {label}
          </button>
        ))}
      </div>
      <div id="ea-idea-detail" className="ea-idea-detail">
        <p className="label" aria-live="polite">{visited.length} of {ideas.length} ideas explored</p>
        <div key={selected} className="ea-idea-detail__body" aria-live="polite">
          <h2 className="display mt-2 text-xl">{idea.title}</h2>
          <p className="mt-2 text-mute">{idea.copy}</p>
          <Link className="ea-source-link mt-3 inline-block underline underline-offset-4" href={idea.href}>{idea.action} ↗</Link>
        </div>
      </div>
    </section>
  );
}
