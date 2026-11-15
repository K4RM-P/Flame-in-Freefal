"use client";

import Link from "next/link";
import { useState } from "react";

const views = {
  evidence: {
    label: "What NASA tested",
    heading: "Start with the experiment.",
    copy: "The Saffire-II comparison shows how matched samples behaved on Earth and in orbit. Follow the original NASA record to see what conditions the comparison covers.",
    href: "/evidence#earth-vs-orbit",
    action: "Open the comparison",
  },
  model: {
    label: "What EmberAtlas models",
    heading: "Change a cabin condition.",
    copy: "Run a scenario, then check the evidence and assumptions behind it. A result beyond the tested range shows what the model estimates for those inputs.",
    href: "/simulator",
    action: "Open the simulator",
  },
} as const;

export function MissionLog() {
  const [view, setView] = useState<keyof typeof views>("evidence");
  const selected = views[view];

  return (
    <section id="compare-views" className="ea-mission-console card" aria-labelledby="compare-title">
      <h2 id="compare-title" className="display text-2xl">One question, two ways to investigate</h2>
      <div className="ea-jumps mt-4" aria-label="Investigation view" role="group">
        {Object.entries(views).map(([key, option]) => (
          <button className="btn" key={key} type="button" aria-pressed={view === key} onClick={() => setView(key as keyof typeof views)}>
            {option.label}
          </button>
        ))}
      </div>
      <div key={view} className="ea-mission-view mt-5 border-t border-line pt-5">
        <h3 className="display text-xl">{selected.heading}</h3>
        <p className="measure my-3 text-base text-mute" aria-live="polite">{selected.copy}</p>
        <Link className="ea-source-link underline underline-offset-4" href={selected.href}>{selected.action} ↗</Link>
      </div>
    </section>
  );
}
