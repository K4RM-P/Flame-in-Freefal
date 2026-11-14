"use client";
import { useMemo } from "react";
import { Plot } from "@/components/Plot";
import { SourcePill } from "@/components/bits";
import { useMission } from "@/lib/store";
import { CONFLICTS, COVERAGE, proposeExperiments } from "@/lib/gaps";
import { GOLDEN_QUESTIONS } from "@/lib/ai/questions";

export function GapsSection() {
  const m = useMission();
  const props = useMemo(() => proposeExperiments(m, 10), [m]);
  const o2 = [...new Set(COVERAGE.map((c) => c.o2_lo))], p = [...new Set(COVERAGE.map((c) => c.p_lo))];
  const grids = [0, 0.165, 0.378, 1].map((g) => ({ g, z: p.map((pl) => o2.map((ol) => COVERAGE.find((c) => c.g === g && c.o2_lo === ol && c.p_lo === pl)?.n ?? 0)) }));
  return (
    <div className="space-y-6">
      <div><h2 className="display text-[24px]">Where the evidence runs out — and what to fly next</h2>
        <p className="text-sm text-mute">Coverage of verified PSI test points in EmberAtlas (currently FLEX droplets only; solids await digitization). Moon and Mars columns are empty by construction: PSI has no partial-gravity data.</p></div>
      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {grids.map((G) => (
          <div key={G.g} className="card">
            <span className="label">g = {G.g}</span>
            <Plot height={240} data={[{ type: "heatmap", x: o2.map((x) => `${Math.round(x * 100)}–${Math.round(x * 100) + 5}%`), y: p.map((x, i) => `${x}–${COVERAGE.find((c) => c.p_lo === x)?.p_hi ?? ""}`), z: G.z,
              colorscale: [[0, "#121722"], [0.01, "#3a1a10"], [1, "#E69F00"]], zmin: 0, zmax: 60, showscale: false, hovertemplate: "O₂ %{x}<br>P %{y} kPa<br>%{z} points<extra></extra>" }]}
              layout={{ margin: { l: 60, r: 8, t: 8, b: 56 }, xaxis: { title: { text: "O₂" }, tickangle: -45 }, yaxis: { title: { text: "kPa" } } }} />
          </div>
        ))}
      </section>
      <section className="card space-y-4">
        <span className="label">Conflicting evidence</span>
        {CONFLICTS.map((c) => (
          <div key={c.id} className="rounded border border-line p-3 text-sm">
            <h3 className="font-semibold">{c.title}</h3>
            <p className="mt-1">A: {c.a.claim} <SourcePill id={c.a.source} /></p>
            <p>B: {c.b.claim} <SourcePill id={c.b.source} /></p>
            <p className="mt-1 text-mute">Why it conflicts: {c.why}</p>
            <p className="text-ink">Discriminating test: {c.test}</p>
          </div>
        ))}
      </section>
      <section className="card">
        <div className="flex items-center justify-between"><span className="label">Proposed next test points (coverage-based)</span>
          <button className="btn-accent" data-testid="draft-proposal" onClick={() => useMission.setState({ drawer: { kind: "ask", question: GOLDEN_QUESTIONS[10] } })}>Draft proposal</button></div>
        <p className="mb-2 text-xs text-warn">Fallback method: ranks untested conditions by proximity to the mission and data scarcity. GP/BALD active learning (U9) needs the U7 boundary model, which needs digitized BASS-II/Saffire outcomes.</p>
        <table className="data"><thead><tr><th>#</th><th>O₂</th><th>P kPa</th><th>flow cm/s</th><th>g</th><th>material</th><th>rig</th><th>why</th></tr></thead>
          <tbody>{props.map((q) => <tr key={q.rank}><td>{q.rank}</td><td className="num">{(q.x_o2 * 100).toFixed(1)}%</td><td className="num">{q.P_kPa}</td><td className="num">{q.flow_cm_s}</td><td>{q.g}</td><td>{q.material}</td><td className="text-xs">{q.rig}</td><td className="text-xs text-mute">{q.reason}</td></tr>)}</tbody></table>
      </section>
    </div>
  );
}
