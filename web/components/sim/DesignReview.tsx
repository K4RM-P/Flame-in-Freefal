// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// "Prevent": ranked design fixes from lib/sim/designReview (deterministic, no API). Minimal markup with existing classes;
// the UI session owns the styling.
"use client";
import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";
import { runAll } from "./bits";
import { useSim } from "./store";
import { designReview, show } from "@/lib/sim/designReview";
import type { Scenario, SimResult } from "@/lib/sim/types";

export function DesignReview({ sc, r, label }: { sc: Scenario; r: SimResult | null; label?: string | null }) {
  const fixes = useMemo(() => (r ? designReview(sc, r) : []), [sc, r]);
  const [applied, setApplied] = useState<string | null>(null);
  const reduce = useReducedMotion();
  /** Apply & re-run: the fix's own edited copy becomes Scenario B, both run, and the Compare split opens. */
  async function apply(id: string, fixed: Scenario) {
    const st = useSim.getState();
    st.set({ b: { ...structuredClone(fixed), name: `${sc.name} · fixed` }, editing: "a", ra: null, rb: null, frame: 0 });
    await runAll();
    useSim.getState().set({ frame: 0, playing: true });
    setApplied(id);
  }
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
              {f.scenario && <Button size="sm" variant="secondary" className="mt-1 h-7" data-testid="apply-fix" onClick={() => void apply(f.id, f.scenario!)}>Apply &amp; re-run</Button>}
              {applied === f.id && <motion.p data-testid="fix-delta" className="num mt-1 text-[13px]" initial={reduce ? false : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
                Applied as Scenario B: {f.metric} {show(f.before, f.units)} → {show(f.after, f.units)} (Compare split open)</motion.p>}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
