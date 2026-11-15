"use client";
// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Evidence page: (a) SAFFIRE-II Earth test vs orbit, (b) where the PSI-tested envelope stops for the Lunar Habitat,
// (c) the mission-to-experiment match (the one AI surface on this page). Every number comes from lib/sim/evidence.
import Link from "next/link";
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
    <div className="ea-evidence mx-auto max-w-[1240px] space-y-6 pb-12">
      <header className="ea-research-hero">
        <p className="label">NASA PSI evidence</p>
        <h1 className="display mt-2 text-[clamp(2rem,5vw,3.6rem)] leading-none">What NASA has tested, and where it stops.</h1>
        <p className="measure mt-3 text-base text-mute">Compare flight results, see where test coverage ends, or find an experiment for your mission.</p>
        <nav className="ea-jumps mt-5" aria-label="Evidence sections">
          <a href="#earth-vs-orbit">Earth vs. orbit</a>
          <a href="#where-evidence-stops">Test coverage</a>
          <a href="#experiment-match">Experiment match</a>
        </nav>
      </header>

      <section id="earth-vs-orbit" aria-labelledby="evo-h" className="ea-evidence-section space-y-4 scroll-mt-24">
        <h2 id="evo-h" className="text-[22px] font-semibold">Does the Earth test hold up in orbit?</h2>
        <p className="measure text-mute">Under the study’s matched conditions, {counts.better} of {counts.n} samples were less flammable in orbit and {counts.same} had the same outcome. This comparison covers only the samples and conditions tested.</p>
        <a className="ea-source-link inline-block underline underline-offset-4" href="https://doi.org/10.60555/2chp-m469">Original NASA dataset · Saffire-II, PSI-99 ↗</a>
        <div data-testid="evo-counts" className="space-y-3">
          <p className="text-mute"><span className="num">{counts.n}</span> like-for-like Saffire-II samples</p>
          <dl className="ea-evidence-counts">
            {[[counts.better, "Less flammable in orbit"], [counts.same, "Same outcome"], [counts.worse, "More flammable in orbit"]].map(([count, label]) => (
              <div key={label}><dt>{label}</dt><dd className="num">{count}</dd></div>
            ))}
          </dl>
        </div>
        <div className="ea-table-scroll ea-research-table overflow-x-auto" tabIndex={0} role="region" aria-labelledby="evo-h">
          <table className="data">
            <thead><tr><th>sample</th><th>material</th><th className="ea-numeric">thickness</th><th className="ea-numeric">O₂</th><th>flow + direction</th><th>1 g result</th><th>µg result</th><th>agreement</th></tr></thead>
            <tbody>
              {evo.rows.map((r, i) => (
                <tr key={`${r.sample}-${i}`} title={[r.source_id, r.locator].filter(Boolean).join(" · ")}>
                  <td className="num">{r.sample}</td><td>{r.material}</td><td className="num ea-numeric">{r.thickness}{/^0\d/.test(String(r.thickness)) && <span className="text-warn" title="Raw PSI-99 cell, shown as written (decimal point likely missing)"> †</span>}</td>
                  <td className="num ea-numeric">{r.x_o2_lo === r.x_o2_hi || r.x_o2_hi == null ? pct(r.x_o2_lo) : `${pct(r.x_o2_lo)}–${pct(r.x_o2_hi)}`}%</td>
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
        {evo.rows.some((r: { thickness?: unknown }) => /^0\d/.test(String(r.thickness))) && <p className="text-[12px] text-faint"><span className="text-warn">†</span> Raw PSI-99 cell shown as written; the decimal point looks missing (likely 0.37 mm). Not corrected here.</p>}
        {evo.source_ids.length > 0 && <p className="text-[12px] text-faint">Sources: {evo.source_ids.join(", ")}</p>}
        <Link className="btn-accent" href="/simulator">Try a cabin scenario →</Link>
      </section>

      <section id="where-evidence-stops" aria-labelledby="stops-h" className="ea-evidence-section space-y-4 scroll-mt-24">
        <h2 id="stops-h" className="text-[22px] font-semibold">Where the evidence stops</h2>
        <p className="measure text-mute">Use these ranges to see whether the selected cabin conditions have been tested for each material. A value outside the tested range needs more evidence before it can support a design decision.</p>
        <p className="text-[14px] text-mute">
          {m.name}: <span className="num">{pct(m.x_o2)}% O₂ · {sig(m.P_Pa / 1e3, 3)} kPa · {sig(m.flow_m_s * 100, 3)} cm/s · {sig(m.gravity_g, 3)} g</span>.
          {stops.max_solid_x_o2 != null && <> Highest O₂ tested for a solid in PSI: <span className="num">{pct(stops.max_solid_x_o2)}%</span>.</>}
          {" "}<span className="text-warn">Amber</span> = the habitat value lies outside every tested range for that material.
        </p>
        <div className="ea-table-scroll ea-research-table overflow-x-auto" tabIndex={0} role="region" aria-labelledby="stops-h">
          <table className="data">
            <thead><tr><th>material</th><th className="ea-numeric">tested O₂ %</th><th className="ea-numeric">tested pressure kPa</th><th className="ea-numeric">tested flow cm/s</th><th>investigations</th></tr></thead>
            <tbody>
              {stops.rows.map((r) => (
                <tr key={r.material_key}>
                  <td>{r.display_name}</td>
                  <td className={`num ea-numeric ${r.beyond.o2 ? "text-warn" : ""}`}>{fmtRange(r.o2_range, 100)}{r.beyond.o2 && ` (habitat ${pct(m.x_o2)})`}</td>
                  <td className={`num ea-numeric ${r.beyond.P ? "text-warn" : ""}`}>{fmtRange(r.P_range_Pa, 1e-3)}{r.beyond.P && ` (habitat ${sig(m.P_Pa / 1e3, 3)})`}</td>
                  <td className={`num ea-numeric ${r.beyond.flow ? "text-warn" : ""}`}>{fmtRange(r.flow_range_m_s, 100)}{r.beyond.flow && ` (habitat ${sig(m.flow_m_s * 100, 3)})`}</td>
                  <td className="text-[12px] text-mute">{r.investigations.join(", ") || "—"}</td>
                </tr>
              ))}
              {!stops.rows.length && <tr><td colSpan={5} className="text-mute">∅ No tested materials.</td></tr>}
            </tbody>
          </table>
        </div>
        {stops.bre_note && <p className="text-[12px] text-mute">{stops.bre_note}</p>}
      </section>

      <section id="experiment-match" aria-label="Mission to experiment match" className="ea-evidence-section scroll-mt-24">
        <ExperimentMatch />
      </section>
    </div>
  );
}
