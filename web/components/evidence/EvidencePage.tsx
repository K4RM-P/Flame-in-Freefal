"use client";
// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Evidence page: (a) SAFFIRE-II Earth test vs orbit, (b) where the PSI-tested envelope stops for the Lunar Habitat,
// (c) the mission-to-experiment match (the one AI surface on this page). Every number comes from lib/sim/evidence.
import Link from "next/link";
import { Fragment, useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import tablesIndex from "@/data/psi/tables_index.json";
import catalog from "@/data/psi_catalog.json";
import { CopyLink, useScrollSpy } from "@/components/ui/copy-link";
import { cn } from "@/lib/utils";
import { earthVsOrbitSummary, evidenceStops } from "@/lib/sim/evidence";
import { sig } from "@/lib/ui/format";
import { ExperimentMatch } from "@/components/match/ExperimentMatch";

type Range = [number, number] | null;
const pct = (x: number | null | undefined) => (x == null ? "—" : sig(x * 100, 3));
const fmtRange = (r: Range, k: number) => (!r ? "∅ not tested" : r[0] === r[1] ? `${sig(r[0] * k, 3)}` : `${sig(r[0] * k, 3)}–${sig(r[1] * k, 3)}`);

const TOC = [["earth-vs-orbit", "Earth vs. orbit"], ["where-evidence-stops", "Test coverage"], ["psi-datasets", "PSI datasets"], ["experiment-match", "Experiment match"]] as const;
const TOC_IDS = TOC.map(([id]) => id);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CAT: Record<string, any> = (catalog as any).investigations ?? {};
type Table = { key: string; rows: number; accessions: string[]; files: string[]; qc_rows?: number };

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" aria-pressed={on} onClick={onClick} className={cn("ea-pill h-7 cursor-pointer px-2.5 transition-colors", on ? "border-ember/60 text-ink" : "hover:text-ink")}>{children}</button>;
}

export function EvidencePage() {
  const evo = useMemo(() => earthVsOrbitSummary(), []);
  const stops = useMemo(() => evidenceStops("LunarHabitat"), []);
  const { counts } = evo;
  const m = stops.mission;
  const active = useScrollSpy(TOC_IDS as unknown as string[]);
  const [mat, setMat] = useState<string | null>(null);
  const [o2, setO2] = useState<number | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [openPsi, setOpenPsi] = useState<string | null>(null);
  const materials = useMemo(() => [...new Set(evo.rows.map((r) => String(r.material ?? "")).filter(Boolean))], [evo]);
  const o2s = useMemo(() => [...new Set(evo.rows.map((r) => r.x_o2_lo).filter((x): x is number => typeof x === "number"))].sort((a, b) => a - b), [evo]);
  const rows = evo.rows.filter((r) => (!mat || r.material === mat) && (o2 == null || r.x_o2_lo === o2));
  const psi = useMemo(() => {
    const map = new Map<string, { accession: string; name: string; rows: number; files: string[] }>();
    for (const t of tablesIndex as Table[]) for (const a of t.accessions) {
      const prev = map.get(a);
      map.set(a, { accession: a, name: String(CAT[a]?.short_name ?? CAT[a]?.title ?? t.key), rows: (prev?.rows ?? 0) + t.rows, files: [...(prev?.files ?? []), ...t.files.filter((f) => f.startsWith(a + "_") || t.accessions.length === 1)] });
    }
    return [...map.values()].sort((x, y) => Number(x.accession.slice(4)) - Number(y.accession.slice(4)));
  }, []);
  return (
    <div className="ea-evidence mx-auto grid max-w-[1240px] gap-10 pb-12 lg:grid-cols-[200px_minmax(0,1fr)]">
      <aside className="hidden lg:block" aria-label="On this page">
        <nav className="ea-toc sticky top-20 space-y-0.5" aria-label="Evidence sections">
          <p className="ea-meta mb-2 px-2.5">On this page</p>
          {TOC.map(([id, l]) => <a key={id} href={`#${id}`} aria-current={active === id ? "true" : undefined}>{l}</a>)}
        </nav>
      </aside>
      <div className="min-w-0 space-y-6">
      <header className="ea-research-hero">
        <p className="label">NASA PSI evidence</p>
        <h1 className="display mt-2 text-[clamp(2rem,5vw,3.6rem)] leading-none">What NASA has tested, and where it stops.</h1>
        <p className="measure mt-3 text-base text-mute">Compare flight results, see where test coverage ends, or find an experiment for your mission.</p>
        <nav className="ea-jumps mt-5 lg:hidden" aria-label="Evidence jump links">
          {TOC.map(([id, l]) => <a key={id} href={`#${id}`}>{l}</a>)}
        </nav>
      </header>

      <section id="earth-vs-orbit" aria-labelledby="evo-h" className="ea-evidence-section space-y-4 scroll-mt-24">
        <h2 id="evo-h" className="text-[22px] font-semibold tracking-[-0.02em]">Does the Earth test hold up in orbit?<CopyLink id="earth-vs-orbit" label="Earth vs. orbit" /></h2>
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
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter samples">
          <span className="ea-meta mr-1">Material</span>
          <Chip on={mat == null} onClick={() => setMat(null)}>All</Chip>
          {materials.map((x) => <Chip key={x} on={mat === x} onClick={() => setMat(mat === x ? null : x)}>{x}</Chip>)}
          <span className="ea-meta ml-3 mr-1">O₂</span>
          <Chip on={o2 == null} onClick={() => setO2(null)}>All</Chip>
          {o2s.map((x) => <Chip key={x} on={o2 === x} onClick={() => setO2(o2 === x ? null : x)}>{pct(x)}%</Chip>)}
          <span className="ml-auto font-mono text-[11px] text-faint"><span className="num">{rows.length}</span> / <span className="num">{evo.rows.length}</span> rows · click a row for its PSI file and line</span>
        </div>
        <div className="ea-table-scroll ea-research-table max-h-[70vh] overflow-auto" tabIndex={0} role="region" aria-labelledby="evo-h">
          <table className="data">
            <thead><tr><th className="w-6" aria-label="Expand" /><th>sample</th><th>material</th><th className="ea-numeric">thickness</th><th className="ea-numeric">O₂</th><th>flow + direction</th><th>1 g result</th><th>µg result</th><th>agreement</th></tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <Fragment key={`${r.sample}-${i}`}>
                <tr className="cursor-pointer" aria-expanded={open === i} tabIndex={0} onClick={() => setOpen(open === i ? null : i)} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setOpen(open === i ? null : i))}>
                  <td className="text-faint"><ChevronRight size={12} strokeWidth={1.5} className={cn("transition-transform", open === i && "rotate-90")} /></td>
                  <td className="num">{r.sample}</td><td>{r.material}</td><td className="num ea-numeric">{r.thickness}{/^0\d/.test(String(r.thickness)) && <span className="text-warn" title="Raw PSI-99 cell, shown as written (decimal point likely missing)"> †</span>}</td>
                  <td className="num ea-numeric">{r.x_o2_lo === r.x_o2_hi || r.x_o2_hi == null ? pct(r.x_o2_lo) : `${pct(r.x_o2_lo)}–${pct(r.x_o2_hi)}`}%</td>
                  <td className="num">{r.flow_cm_s == null ? "—" : sig(r.flow_cm_s, 3)} cm/s {String(r.flow_direction ?? "").toLowerCase()}</td>
                  <td>{[r.g1_burn_length, r.g1_spread_rate].filter((x) => x != null && x !== "").join(" · ") || "—"}</td>
                  <td>{[r.ug_burn_length, r.ug_spread].filter((x) => x != null && x !== "").join(" · ") || "—"}</td>
                  <td>{r.agreement ?? "—"}</td>
                </tr>
                {open === i && <tr className="bg-bg"><td /><td colSpan={8} className="font-mono text-[11px] text-mute"><span className="text-ember-text">{r.source_id ?? "—"}</span> · {r.locator ?? "no locator"}</td></tr>}
                </Fragment>
              ))}
              {!rows.length && <tr><td colSpan={9} className="text-mute">∅ No like-for-like rows match these filters.</td></tr>}
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
        <h2 id="stops-h" className="text-[22px] font-semibold tracking-[-0.02em]">Where the evidence stops<CopyLink id="where-evidence-stops" label="Where the evidence stops" /></h2>
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

      <section id="psi-datasets" aria-labelledby="psi-h" className="ea-evidence-section space-y-4 scroll-mt-24">
        <h2 id="psi-h" className="text-[22px] font-semibold tracking-[-0.02em]">NASA PSI datasets in EmberAtlas<CopyLink id="psi-datasets" label="PSI datasets" /></h2>
        <p className="measure text-mute"><span className="num">{psi.length}</span> accessions, <span className="num">{psi.reduce((s, p) => s + p.rows, 0).toLocaleString("en-US")}</span> rows with provenance. Click a dataset for its source files.</p>
        <div className="ea-table-scroll overflow-x-auto" role="region" aria-labelledby="psi-h" tabIndex={0}>
          <table className="data">
            <thead><tr><th className="w-6" aria-label="Expand" /><th>accession</th><th>investigation</th><th className="ea-numeric">rows</th></tr></thead>
            <tbody>
              {psi.map((p) => (
                <Fragment key={p.accession}>
                  <tr id={p.accession.toLowerCase()} className="scroll-mt-24 cursor-pointer target:bg-surface2" aria-expanded={openPsi === p.accession} tabIndex={0} onClick={() => setOpenPsi(openPsi === p.accession ? null : p.accession)} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setOpenPsi(openPsi === p.accession ? null : p.accession))}>
                    <td className="text-faint"><ChevronRight size={12} strokeWidth={1.5} className={cn("transition-transform", openPsi === p.accession && "rotate-90")} /></td>
                    <td className="num text-ember-text">{p.accession}</td><td>{p.name}</td><td className="num ea-numeric">{p.rows.toLocaleString("en-US")}</td>
                  </tr>
                  {openPsi === p.accession && <tr className="bg-bg"><td /><td colSpan={3} className="font-mono text-[11px] text-mute">{p.files.length ? p.files.join(" · ") : "—"} · <a className="underline underline-offset-2" href={`https://psi.nasa.gov/physci/repo/search?q=${encodeURIComponent(p.accession)}`} target="_blank" rel="noreferrer">PSI record ↗</a></td></tr>}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section id="experiment-match" aria-label="Mission to experiment match" className="ea-evidence-section scroll-mt-24">
        <ExperimentMatch />
      </section>
      </div>
    </div>
  );
}
