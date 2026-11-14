"use client";
// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Evidence page: (a) SAFFIRE-II Earth test vs orbit, (b) where the PSI-tested envelope stops for the Lunar Habitat,
// (c) the mission-to-experiment match (the one AI surface on this page). Every number comes from lib/sim/evidence.
import { useMemo } from "react";
import { earthVsOrbitSummary, evidenceStops } from "@/lib/sim/evidence";
import { sig } from "@/lib/ui/format";
import { ExperimentMatch } from "@/components/match/ExperimentMatch";

type Range = [number, number] | null;
const pct = (x: number | null | undefined) => (x == null ? "—" : sig(x * 100, 3));
const fmtRange = (r: Range, k: number) => (!r ? "∅ not tested" : r[0] === r[1] ? `${sig(r[0] * k, 3)}` : `${sig(r[0] * k, 3)}–${sig(r[1] * k, 3)}`);

export function EvidencePage() {
  const evo = useMemo(() => earthVsOrbitSummary(), []);
  const stops = useMemo(() => evidenceStops("LunarHabitat"), []);
  const { counts } = evo;
  const m = stops.mission;
  return (
    <div className="mx-auto max-w-[1240px] space-y-10">
      <header className="border-b border-line pb-4">
        <p className="label">NASA PSI evidence</p>
        <h1 className="display mt-2 text-[clamp(2rem,5vw,3.6rem)] leading-none">What NASA has tested, and where it stops.</h1>
      </header>

      <section aria-labelledby="evo-h" className="space-y-3">
        <h2 id="evo-h" className="text-[22px] font-semibold">Does the Earth test hold up in orbit?</h2>
        <div data-testid="evo-counts" className="panel p-3 text-[16px]">
          <span className="num">{counts.n}</span> like-for-like SAFFIRE-II samples: <span className="num">{counts.better}</span> less flammable in orbit, <span className="num">{counts.same}</span> the same, <span className="num">{counts.worse}</span> worse
        </div>
        <div className="overflow-x-auto">
          <table className="data">
            <thead><tr><th>sample</th><th>material</th><th>thickness</th><th>O₂</th><th>flow + direction</th><th>1 g result</th><th>µg result</th><th>agreement</th></tr></thead>
            <tbody>
              {evo.rows.map((r, i) => (
                <tr key={`${r.sample}-${i}`} title={[r.source_id, r.locator].filter(Boolean).join(" · ")}>
                  <td className="num">{r.sample}</td><td>{r.material}</td><td className="num">{r.thickness}</td>
                  <td className="num">{r.x_o2_lo === r.x_o2_hi || r.x_o2_hi == null ? pct(r.x_o2_lo) : `${pct(r.x_o2_lo)}–${pct(r.x_o2_hi)}`}%</td>
                  <td className="num">{r.flow_cm_s == null ? "—" : sig(r.flow_cm_s, 3)} cm/s {String(r.flow_direction ?? "").toLowerCase()}</td>
                  <td>{[r.g1_burn_length, r.g1_spread_rate].filter((x) => x != null && x !== "").join(" · ") || "—"}</td>
                  <td>{[r.ug_burn_length, r.ug_spread].filter((x) => x != null && x !== "").join(" · ") || "—"}</td>
                  <td>{r.agreement ?? "—"}</td>
                </tr>
              ))}
              {!evo.rows.length && <tr><td colSpan={8} className="text-mute">∅ No like-for-like rows.</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="text-[12px] text-warn">SAFFIRE-II, PSI-99, like-for-like samples, small n</p>
        {evo.caveats.length > 0 && <ul className="list-disc space-y-0.5 pl-5 text-[12px] text-mute">{evo.caveats.map((c, i) => <li key={i}>{c}</li>)}</ul>}
        {evo.source_ids.length > 0 && <p className="text-[12px] text-faint">Sources: {evo.source_ids.join(", ")}</p>}
      </section>

      <section aria-labelledby="stops-h" className="space-y-3">
        <h2 id="stops-h" className="text-[22px] font-semibold">Where the evidence stops</h2>
        <p className="text-[14px] text-mute">
          {m.name}: <span className="num">{pct(m.x_o2)}% O₂ · {sig(m.P_Pa / 1e3, 3)} kPa · {sig(m.flow_m_s * 100, 3)} cm/s · {sig(m.gravity_g, 3)} g</span>.
          {stops.max_solid_x_o2 != null && <> Highest O₂ tested for a solid in PSI: <span className="num">{pct(stops.max_solid_x_o2)}%</span>.</>}
          {" "}<span className="text-warn">Amber</span> = the habitat value lies outside every tested range for that material.
        </p>
        <div className="overflow-x-auto">
          <table className="data">
            <thead><tr><th>material</th><th>tested O₂ %</th><th>tested pressure kPa</th><th>tested flow cm/s</th><th>investigations</th></tr></thead>
            <tbody>
              {stops.rows.map((r) => (
                <tr key={r.material_key}>
                  <td>{r.display_name}</td>
                  <td className={`num ${r.beyond.o2 ? "text-warn" : ""}`}>{fmtRange(r.o2_range, 100)}{r.beyond.o2 && ` (habitat ${pct(m.x_o2)})`}</td>
                  <td className={`num ${r.beyond.P ? "text-warn" : ""}`}>{fmtRange(r.P_range_Pa, 1e-3)}{r.beyond.P && ` (habitat ${sig(m.P_Pa / 1e3, 3)})`}</td>
                  <td className={`num ${r.beyond.flow ? "text-warn" : ""}`}>{fmtRange(r.flow_range_m_s, 100)}{r.beyond.flow && ` (habitat ${sig(m.flow_m_s * 100, 3)})`}</td>
                  <td className="text-[12px] text-mute">{r.investigations.join(", ") || "—"}</td>
                </tr>
              ))}
              {!stops.rows.length && <tr><td colSpan={5} className="text-mute">∅ No tested materials.</td></tr>}
            </tbody>
          </table>
        </div>
        {stops.bre_note && <p className="text-[12px] text-mute">{stops.bre_note}</p>}
      </section>

      <section aria-label="Mission to experiment match" className="border-t border-line pt-6">
        <ExperimentMatch />
      </section>
    </div>
  );
}
