// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// "Prevent": ranked design fixes from lib/sim/designReview (deterministic, no API). Minimal markup with existing classes;
// the UI session owns the styling.
"use client";
import { useMemo } from "react";
import { create } from "zustand";
import { motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";
import { runAll } from "./bits";
import { useSim } from "./store";
import { designReview, metricOf, show } from "@/lib/sim/designReview";
import type { Scenario, SimResult } from "@/lib/sim/types";

/** The last applied fix survives the A → B remount of the review (B becomes the scenario under review). */
const useApplied = create<{ applied: { id: string; before: number | null; after: number | null } | null; set: (p: { applied: { id: string; before: number | null; after: number | null } | null }) => void }>((set) => ({ applied: null, set: (p) => set(p) }));

export function DesignReview({ sc, r, label }: { sc: Scenario; r: SimResult | null; label?: string | null }) {
  const fixes = useMemo(() => (r ? designReview(sc, r) : []), [sc, r]);
  const { applied, set: setApplied } = useApplied();
  const reduce = useReducedMotion();
  /** Apply & re-run: the fix's own edited copy becomes Scenario B, both run, and the Compare split opens. */
  async function apply(id: string, fixed: Scenario) {
    const st = useSim.getState();
    st.set({ b: { ...structuredClone(fixed), name: `${sc.name} · fixed` }, editing: "a", ra: null, rb: null, frame: 0 });
    await runAll();
    const { ra, rb } = useSim.getState();
    useSim.getState().set({ frame: 0, playing: true, view: "3d" });
    const f = fixes.find((x) => x.id === id);
    // Before/after read back from the two engine runs just made (A = as designed, B = with the fix).
    if (f && ra && rb) setApplied({ applied: { id, before: metricOf(ra, f.metric), after: metricOf(rb, f.metric) } });
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
              {applied?.id === f.id && <motion.div data-testid="fix-delta" className="mt-1.5 flex items-center gap-2 rounded-lg border border-line bg-bg px-2.5 py-1.5 text-[13px]"
                initial={reduce ? false : { opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", stiffness: 320, damping: 24 }}>
                <span className="text-mute">{f.metric.replace(/_/g, " ")}</span>
                <span className="num text-faint line-through decoration-faint/60">{show(applied.before, f.units)}</span>
                <motion.span className="text-mute" initial={reduce ? false : { x: -6, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.15 }}>→</motion.span>
                <motion.span className="num font-medium text-ink" data-testid="fix-after" initial={reduce ? false : { y: 6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3, type: "spring", stiffness: 300, damping: 20 }}>{show(applied.after, f.units)}</motion.span>
                <span className="ml-auto text-[11px] text-faint">A vs B · Compare open</span>
              </motion.div>}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
