"use client";
import { useMemo, useState } from "react";
import { useMission } from "@/lib/store";
import { DEFAULT_WEIGHTS, INVESTIGATIONS, rank, type Weights } from "@/lib/ranking";
import { TEST_POINTS } from "@/lib/testPoints";
import { SourcePill, fmt } from "@/components/bits";
import { download } from "@/lib/report";
import { GapsSection } from "@/components/library/GapsSection";
import { EarthSection } from "@/components/library/EarthSection";

export default function Evidence() {
  const m = useMission();
  const [w, setW] = useState<Weights>(DEFAULT_WEIGHTS);
  const [sel, setSel] = useState<string[]>(["FLEX", "BASS-II"]);
  const [filter, setFilter] = useState({ fuel: "all", diluent: "all", split: "all" });
  const ranked = useMemo(() => rank(m, w), [m, w]);
  const rows = TEST_POINTS.filter((t) => (filter.fuel === "all" || t.fuel === filter.fuel) && (filter.diluent === "all" || t.diluent === filter.diluent) && (filter.split === "all" || t.split === filter.split));
  const exportRows = (fmtType: "csv" | "json") => {
    if (fmtType === "json") return download("emberatlas_test_points.json", JSON.stringify(rows, null, 1), "application/json");
    const cols = Object.keys(rows[0]) as (keyof (typeof rows)[number])[];
    const esc = (v: unknown) => (v == null ? "" : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
    download("emberatlas_test_points.csv", [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n"), "text/csv");
  };
  const cards = INVESTIGATIONS.filter((i) => sel.includes(i.id));
  return (
    <div className="space-y-6">
      <div><h1 className="display text-[32px]">Evidence Library</h1>
        <p className="text-sm text-mute">Which PSI investigations matter for this mission atmosphere ({fmt(m.x_o2 * 100)}% O₂, {m.P_kPa} kPa, {m.flow_cm_s} cm/s)? Edit weights; hover a bar for the breakdown.</p></div>
      <section className="grid gap-4 lg:grid-cols-3">
        <div className="card space-y-2">
          <span className="label">Weights</span>
          {(Object.keys(w) as (keyof Weights)[]).map((k) => (
            <label key={k} className="block text-sm"><span className="text-mute">{k}</span> <span className="num">{w[k].toFixed(2)}</span>
              <input type="range" min={0} max={1} step={0.05} value={w[k]} className="w-full" onChange={(e) => setW({ ...w, [k]: Number(e.target.value) })} /></label>
          ))}
          <button className="btn" onClick={() => setW(DEFAULT_WEIGHTS)}>Reset</button>
        </div>
        <div className="card lg:col-span-2">
          <span className="label">Ranking (click to compare)</span>
          <ol className="mt-2 space-y-1">{ranked.map((r, i) => (
            <li key={r.id} className="flex items-center gap-2 text-sm" title={Object.entries(r.parts).map(([k, p]) => `${k}: ${p.s.toFixed(2)} — ${p.why}`).join("\n")}>
              <span className="num w-5 text-mute">{i + 1}</span>
              <button className={`w-40 truncate text-left ${sel.includes(r.id) ? "text-ink" : ""}`} onClick={() => setSel((s) => (s.includes(r.id) ? s.filter((x) => x !== r.id) : [...s, r.id].slice(-3)))}>{r.id}</button>
              <div className="h-3 flex-1 rounded bg-line"><div className="h-3 rounded bg-mute" style={{ width: `${r.score * 100}%` }} /></div>
              <span className="num w-12 text-right">{r.score.toFixed(2)}</span>
              <span className="num w-16 text-right text-xs text-mute">{r.n_points} pts</span>
            </li>))}</ol>
        </div>
      </section>
      <section className={`grid gap-4 md:grid-cols-${Math.max(1, cards.length)}`} style={{ gridTemplateColumns: `repeat(${Math.max(1, cards.length)}, minmax(0,1fr))` }}>
        {cards.map((c) => (
          <article key={c.id} className="card space-y-2 text-sm">
            <div className="flex items-start justify-between"><h3 className="font-semibold">{c.name}</h3><span className="chip bg-warn/15 text-warn" title="Card content awaiting science-checker confirmation">{c.status}</span></div>
            <p className="text-xs text-mute">{c.id} · {c.years} · {c.platform}</p>
            <Field k="Objective" v={c.objective} /><Field k="Approach" v={c.approach} /><Field k="Hardware" v={c.hardware} />
            <Field k="Fuels" v={c.fuels.join(", ")} />
            <Field k="Conditions" v={`O₂ ${c.o2_range?.join("–") ?? "n/t"} · P ${c.p_range_kpa?.join("–") ?? "n/t"} kPa · flow ${c.flow_range_cm_s?.join("–") ?? "n/t"} cm/s · diluents ${c.diluents.join(", ")}`} />
            <Field k="Varied" v={c.variables_varied.join("; ")} /><Field k="Held constant" v={c.held_constant.join("; ")} /><Field k="Sensors" v={c.sensors.join("; ")} />
            <div><span className="label">Key findings</span>{c.key_findings.length ? <ul className="ml-4 list-disc">{c.key_findings.map((f) => <li key={f.text}>{f.text} <SourcePill id={f.source_id} /></li>)}</ul> : <p className="text-mute">Not yet extracted.</p>}</div>
            <div>{c.sources.map((s) => <SourcePill key={s} id={s} />)}</div>
          </article>
        ))}
      </section>
      <section className="card">
        <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
          <span className="label">Verified PSI test points ({rows.length})</span>
          <select value={filter.fuel} onChange={(e) => setFilter({ ...filter, fuel: e.target.value })}><option value="all">all fuels</option><option>n-heptane</option><option>methanol</option></select>
          <select value={filter.diluent} onChange={(e) => setFilter({ ...filter, diluent: e.target.value })}><option value="all">all diluents</option><option>N2</option><option>CO2</option><option>HE</option></select>
          <select value={filter.split} onChange={(e) => setFilter({ ...filter, split: e.target.value })}><option value="all">train+test</option><option>train</option><option>test</option></select>
          <button className="btn" onClick={() => exportRows("csv")} data-testid="export-csv">Export CSV</button><button className="btn" onClick={() => exportRows("json")}>Export JSON</button>
        </div>
        <div className="max-h-[28rem] overflow-auto">
          <table className="data"><thead><tr><th>test</th><th>fuel</th><th>O₂</th><th>diluent</th><th>kPa</th><th>d₀ mm</th><th>K mm²/s</th><th>d_ext mm</th><th>outcome</th><th>split</th><th>provenance</th></tr></thead>
            <tbody>{rows.map((t) => (
              <tr key={t.id}><td className="num">{t.test_label}</td><td>{t.fuel}</td><td className="num">{t.x_o2}</td><td>{t.diluent}{t.x_diluent ? ` ${t.x_diluent}` : ""}</td><td className="num">{fmt(t.pressure_kpa, 4)}</td>
                <td className="num">{fmt(t.d0_mm)}</td><td className="num">{fmt(t.K_mm2_s)}</td><td className="num">{fmt(t.d_ext_mm)}</td><td>{t.outcome}{t.cool_flame ? " · cool flame" : ""}</td><td>{t.split}</td>
                <td className="text-xs text-mute">{t.locator}</td></tr>))}</tbody></table>
        </div>
      </section>
      <section id="gaps" className="scroll-mt-20 border-t border-line pt-6"><GapsSection /></section>
      <section id="earth-vs-orbit" className="scroll-mt-20 border-t border-line pt-6"><EarthSection /></section>
    </div>
  );
}
const Field = ({ k, v }: { k: string; v: string }) => <div><span className="label">{k}</span><p>{v}</p></div>;
