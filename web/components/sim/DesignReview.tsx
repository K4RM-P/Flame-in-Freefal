// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// "Prevent": ranked design fixes from lib/sim/designReview (deterministic, no API). Minimal markup with existing classes;
// the UI session owns the styling.
"use client";
import { useMemo } from "react";
import { designReview, show } from "@/lib/sim/designReview";
import type { Scenario, SimResult } from "@/lib/sim/types";

export function DesignReview({ sc, r, label }: { sc: Scenario; r: SimResult | null; label?: string | null }) {
  const fixes = useMemo(() => (r ? designReview(sc, r) : []), [sc, r]);
  if (!r) return null;
  return (
    <section className="space-y-2" id="design-review" data-testid="design-review">
      <p className="label">Design review · ranked fixes{label ? ` · ${label}` : ""}</p>
      {!fixes.length ? <p className="text-[13px] text-mute">No design gap or lever with a measurable effect in this scenario.</p> : (
        <ol className="space-y-2 text-[13px]">
          {fixes.map((f, i) => (
            <li key={f.id} data-testid="design-fix">
              <p><span className="num text-faint">{i + 1}.</span> <span className="font-medium">{f.title}</span>{" "}
                <span className="num">{show(f.before, f.units)} → {show(f.after, f.units)}</span>{" "}
                <span className={`chip ${f.basis === "theory-only" ? "text-warn" : "text-mute"}`}>{f.basis}</span>
                {!f.inEnvelope && <span className="chip text-warn"> outside PSI envelope</span>}</p>
              <p className="text-mute">{f.detail}</p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
