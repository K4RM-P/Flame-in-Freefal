// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Why each fire ended, in plain words, read only from the engine trace (events + item extinguish reasons). Used by the
// verdict strip, the landing page, Aster and the run diff so every surface says the same thing. No physics here.
import { PROPS } from "@/lib/physics/data";
import type { SimResult } from "./types";

export type EndKind = "quench" | "burnout" | "inerting" | "burning" | "no-fire";
export interface FireEnd { kind: EndKind; t_s: number | null; phrase: string; short: string }

/** The sourced low-flow quench limit that decides "quench" (with its verification status, shown, never hidden). */
export function quenchLimit(): { cm_s: number; source: string; status: string; note: string } {
  const q = PROPS.spread?.low_flow_quench_cm_s ?? {};
  return { cm_s: Number(q.value), source: String(q.source ?? "unsourced"), status: String(q.status ?? "unknown"), note: String(q.note ?? "") };
}

export function fireEnd(r: SimResult): FireEnd {
  const ignited = r.items.some((i) => i.status.includes("burning"));
  if (!ignited) return { kind: "no-fire", t_s: null, phrase: "never ignited", short: "no fire" };
  const ext = r.outcome.metrics.find((m) => m.key === "time_to_extinguish")?.value ?? null;
  if (ext === null) return { kind: "burning", t_s: null, phrase: `still burning at the end of the run (${r.t[r.t.length - 1]} s)`, short: "still burning" };
  // The reason of the item that went out last decides how the fire ended.
  const outs = r.events.filter((e) => e.kind === "extinguished");
  const last = outs.reduce((m, e) => (m === null || e.t_s >= m.t_s ? e : m), null as (typeof outs)[number] | null);
  const reason = (last?.detail.split(":")[0] ?? "") as EndKind;
  if (reason === "quench") {
    const q = quenchLimit();
    return { kind: "quench", t_s: ext, short: "quenched", phrase: `quenched: the air flow past the flame fell below the ${q.cm_s} cm/s low-flow limit (${q.source}${q.status !== "ok" && q.status !== "verified" ? `, ${q.status}` : ""})` };
  }
  if (reason === "inerting") return { kind: "inerting", t_s: ext, short: "inerted", phrase: "inerted: the flame temperature fell below the extinction limit (agent or O₂ depletion)" };
  return { kind: "burnout", t_s: ext, short: "burned out", phrase: "burned out: the flame consumed the whole sample" };
}

/** A/B verdict on fire duration. `ratio` = longer / shorter; `longer` names the side whose fire lasted longer. */
export function durationVerdict(aName: string, ra: SimResult, bName: string, rb: SimResult) {
  const ea = fireEnd(ra), eb = fireEnd(rb);
  if (ea.t_s === null || eb.t_s === null || !(ea.t_s > 0) || !(eb.t_s > 0)) return { ea, eb, ratio: null, longer: null as string | null };
  if (ea.t_s === eb.t_s) return { ea, eb, ratio: 1, longer: null };
  return { ea, eb, ratio: Math.max(ea.t_s, eb.t_s) / Math.min(ea.t_s, eb.t_s), longer: eb.t_s > ea.t_s ? bName : aName };
}
