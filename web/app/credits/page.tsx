// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Credits / data sources: generated from web/data/references.json (= docs/REFERENCES.json, written by
// physics/validate/export.py from physics/data/*.yaml). Nothing here is typed by hand except the section prose.
import type { Metadata } from "next";
import Link from "next/link";
import refs from "@/data/references.json";
import { PSI_USES } from "@/lib/data/psiUses";
import { CHALLENGE_NAME, CHALLENGE_URL, TEAM, TEAM_CITY } from "@/lib/team";

export const metadata: Metadata = { title: "Credits & data sources", description: "Every NASA dataset, paper, library, font and SI tool EmberAtlas uses, with licences." };

type Src = { id: string; type?: string; title: string; url?: string; doi?: string; year?: number };
type Lib = { name: string; version: string; ecosystem: string; license: string };
const R = refs as unknown as {
  psi_records: { id: string; title: string; doi?: string; url?: string; files_used?: string[] }[];
  other_sources: Src[]; apis: { name: string; url: string; use: string }[]; software: Lib[];
  fonts: { name: string; license: string; via: string }[]; components?: { name: string; origin: string; license: string }[];
  si_tools: { name: string; use: string }[]; si_media: string; license: string;
};
const NASA_TYPES = new Set(["ntrs", "nasa", "psi"]);
const link = (s: { url?: string; doi?: string }) => s.url ?? (s.doi ? `https://doi.org/${s.doi}` : undefined);

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return <section id={id} aria-labelledby={`${id}-h`} className="scroll-mt-24 space-y-3"><h2 id={`${id}-h`} className="text-[20px] font-semibold tracking-[-0.02em]">{title}</h2>{children}</section>;
}

export default function Credits() {
  const nasa = R.other_sources.filter((s) => NASA_TYPES.has(s.type ?? "") || /NASA|NTRS/.test(s.title));
  const other = R.other_sources.filter((s) => !nasa.includes(s));
  return (
    <article className="mx-auto max-w-5xl space-y-10 py-8 text-[14px] md:py-12">
      <header className="space-y-3">
        <p className="label">{CHALLENGE_NAME} · NASA Space Apps 2026</p>
        <h1 className="display text-4xl leading-[1.05] md:text-6xl">Credits &amp; data sources</h1>
        <p className="measure text-mute">Team EmberAtlas, {TEAM_CITY}: {TEAM.join(", ")}. Built for the <a className="underline underline-offset-2" href={CHALLENGE_URL} target="_blank" rel="noreferrer">{CHALLENGE_NAME}</a> challenge. This list is generated from <code>docs/REFERENCES.json</code>. NASA does not endorse this project.</p>
      </header>

      <Section id="nasa-psi" title={`NASA PSI datasets (${R.psi_records.length})`}>
        <div className="ea-table-scroll overflow-x-auto" role="region" aria-label="NASA PSI datasets" tabIndex={0}>
          <table className="data"><thead><tr><th>accession</th><th>title</th><th>DOI</th><th>used for</th></tr></thead><tbody>
            {R.psi_records.map((p) => <tr key={p.id}><td className="num">{p.id}</td><td>{p.title}</td><td className="text-[12px]">{p.doi ? <a className="num underline underline-offset-2" href={`https://doi.org/${p.doi}`} target="_blank" rel="noreferrer">{p.doi}</a> : <span className="text-faint">∅</span>}</td><td className="text-[12px] text-mute">{PSI_USES[p.id] ?? "Listed in the bundled study catalog (Aster search); no table rows ingested."}</td></tr>)}
          </tbody></table>
        </div>
        <p className="text-[12px] text-faint">Row-level provenance (file + line) for every value: <Link className="underline" href="/evidence#psi-datasets">Evidence → PSI datasets</Link>.</p>
      </Section>

      <Section id="nasa-reports" title="NASA reports and resources">
        <ul className="space-y-1.5">{nasa.map((s) => <li key={s.id}>{link(s) ? <a className="underline underline-offset-2" href={link(s)} target="_blank" rel="noreferrer">{s.title}</a> : s.title}{s.year ? <span className="num text-faint"> · {s.year}</span> : null}</li>)}</ul>
        <ul className="space-y-1.5 text-mute">{R.apis.map((a) => <li key={a.name}><a className="underline underline-offset-2" href={a.url} target="_blank" rel="noreferrer">{a.name}</a>: {a.use}</li>)}</ul>
      </Section>

      <Section id="other-sources" title="Other data and papers">
        <ul className="space-y-1.5">{other.map((s) => <li key={s.id}>{link(s) ? <a className="underline underline-offset-2" href={link(s)} target="_blank" rel="noreferrer">{s.title}</a> : s.title}{s.year ? <span className="num text-faint"> · {s.year}</span> : null}</li>)}</ul>
      </Section>

      <Section id="ai" title="SI tools">
        <ul className="space-y-2">{R.si_tools.map((t) => <li key={t.name}><b>{t.name}</b><span className="block text-mute">{t.use}</span></li>)}</ul>
        <p className="text-[12px] text-mute">{R.si_media}</p>
      </Section>

      <Section id="fonts" title="Fonts and adapted components">
        <ul className="space-y-1.5">{R.fonts.map((f) => <li key={f.name}>{f.name} <span className="text-faint">· {f.license} · {f.via}</span></li>)}
          {(R.components ?? []).map((c) => <li key={c.name}>{c.name} <span className="text-faint">· {c.license} · {c.origin}</span></li>)}</ul>
      </Section>

      <Section id="software" title={`Code libraries (${R.software.length})`}>
        <div className="ea-table-scroll overflow-x-auto" role="region" aria-label="Code libraries" tabIndex={0}>
          <table className="data"><thead><tr><th>library</th><th>version</th><th>ecosystem</th><th>licence</th></tr></thead><tbody>
            {R.software.map((l) => <tr key={`${l.ecosystem}-${l.name}`}><td className="font-mono text-[12px]">{l.name}</td><td className="num">{l.version}</td><td>{l.ecosystem}</td><td>{l.license}</td></tr>)}
          </tbody></table>
        </div>
        <p className="text-[12px] text-faint">EmberAtlas itself is released under the {R.license} licence (<code>LICENSE</code>).</p>
      </Section>
    </article>
  );
}
