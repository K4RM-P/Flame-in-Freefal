"use client";
// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// "What changed" card: inputs that differ (A → B) and the engine outcomes side by side, with a colour-blind-safe
// verdict (symbol + word, not colour alone). Values come from lib/sim/diff (engine results only).
import { useMemo } from "react";
import { runDiff, type OutcomeRow } from "@/lib/sim/diff";
import type { Scenario, SimResult } from "@/lib/sim/types";
import { withUnit } from "@/lib/ui/format";

const V: Record<OutcomeRow["verdict"], { sym: string; word: string; cls: string }> = {
  better: { sym: "▼", word: "better", cls: "text-ok" }, worse: { sym: "▲", word: "worse", cls: "text-bad" },
  same: { sym: "=", word: "same", cls: "text-mute" }, "n/a": { sym: "∅", word: "no data", cls: "text-faint" },
};
const val = (x: number | null, u: string, fallback: string) => (x === null ? fallback : withUnit(x, u === "mol/mol" ? "" : u, 3) + (u === "mol/mol" ? " mol/mol" : ""));

export function RunDiffCard({ a, ra, b, rb, compact = false }: { a: Scenario; ra: SimResult; b: Scenario; rb: SimResult; compact?: boolean }) {
  const d = useMemo(() => runDiff(a, ra, b, rb), [a, ra, b, rb]);
  return (
    <section className="space-y-2.5 text-[13px]" data-testid="run-diff" aria-label="What changed between A and B">
      <div>
        <p className="ea-meta mb-1">What changed · A → B</p>
        {d.inputs.length ? <ul className="space-y-0.5" data-testid="diff-inputs">{d.inputs.map((c) => (
          <li key={c.key}><span className="text-mute">{c.label}:</span> <span className="num">{c.before}</span> <span className="text-faint">→</span> <span className="num text-ink">{c.after}</span></li>
        ))}</ul> : <p className="text-mute">No input differs: A and B are the same scenario.</p>}
      </div>
      <div className="overflow-x-auto">
        <table className="data w-full min-w-[22rem]" data-testid="diff-outcomes">
          <thead><tr><th scope="col">Outcome</th><th scope="col" className="ea-numeric">A</th><th scope="col" className="ea-numeric">B</th><th scope="col">Change</th></tr></thead>
          <tbody>{d.outcomes.filter((o) => !compact || o.key !== "peak_co").map((o) => {
            const v = V[o.verdict];
            const still = o.key === "time_to_extinguish" ? "still burning" : "—";
            return (
              <tr key={o.key} data-testid={`diff-${o.key}`}>
                <td>{o.label}{o.theoryOnly && <span className="ml-1 rounded border border-dashed border-theory/60 px-1 text-[10px] text-theory">theory-only</span>}{o.note && <span className="block text-[11px] text-faint">{o.note}</span>}</td>
                <td className="num ea-numeric">{val(o.before, o.units, still)}</td>
                <td className="num ea-numeric text-ink">{val(o.after, o.units, still)}</td>
                <td className={`whitespace-nowrap ${v.cls}`}><span aria-hidden>{v.sym}</span> {v.word}</td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>
      <p className="text-[11px] text-faint">Same engine, same seed; only the inputs listed above differ. {d.endA.kind !== d.endB.kind && `The fires end differently: A ${d.endA.short}, B ${d.endB.short}.`}</p>
    </section>
  );
}
