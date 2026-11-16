// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// /credits: every NASA resource and every other data source, paper, library, font, component source, image and AI
// tool, with full public URLs and licences (Space Apps rule). Generated from web/data/references.json, which
// physics/validate/export.py writes from physics/data/software.yaml + sources.yaml (same file as docs/REFERENCES.json).
import type { Metadata } from "next";
import Link from "next/link";
import refs from "@/data/references.json";
import { PageSearch } from "@/components/search/PageSearch";
import { VIDEO_URL, hasVideo } from "@/lib/site";
import { REPO_URL } from "@/components/shell/brand";
import { PSI_USES } from "@/lib/data/psiUses";
import { CHALLENGE_NAME, CHALLENGE_URL, TEAM_CITY, TEAM_NAME } from "@/lib/team";

export const metadata: Metadata = { title: "Credits & data sources", description: "Every NASA resource, dataset, paper, library, font, image and SI tool used by EmberAtlas, with full URLs and licences." };

type Ref = typeof refs;
const R = refs as Ref & {
  component_sources?: { name: string; license: string; url: string; use: string }[];
  images: { name: string; credit: string; license: string; url: string; use: string }[];
  media_guidelines?: string;
  fonts: { name: string; license: string; url: string; via: string; use: string }[];
  si_tools: { name: string; url?: string; use: string; disclosure?: string }[];
  other_sources: { id: string; type: string; title: string; url?: string; year?: number; doi?: string }[];
  software: { name: string; version: string; ecosystem: string; license: string; url: string }[];
};
const isNasa = (u?: string) => !!u && /^https?:\/\/([^/]*\.)?nasa\.gov(\/|$)/.test(u);

function A({ href, children }: { href?: string; children: React.ReactNode }) {
  return href ? <a className="underline underline-offset-2 hover:text-ink" href={href} target="_blank" rel="noreferrer">{children}</a> : <>{children}</>;
}
const Url = ({ u }: { u?: string }) => (u ? <span className="block break-all font-mono text-[11px] text-faint">{u}</span> : <span className="text-[11px] text-warn">no public URL on record</span>);

export default function Credits() {
  const nasaOther = R.other_sources.filter((s) => isNasa(s.url) || s.type === "ntrs");
  const other = R.other_sources.filter((s) => !nasaOther.includes(s));
  const npm = R.software.filter((l) => l.ecosystem === "npm"), py = R.software.filter((l) => l.ecosystem === "pypi");
  return (
    <div className="methods mx-auto max-w-5xl space-y-6 pb-16 text-[15px]">
      <header className="methods-hero">
        <p className="label">NASA Space Apps 2026 · {CHALLENGE_NAME}</p>
        <h1 className="display mt-3 text-4xl md:text-6xl">Credits &amp; data sources</h1>
        <p className="measure mt-4 text-lg text-mute">Everything EmberAtlas uses, with full public URLs: NASA data first, then papers, SI tools, software, fonts and images. Generated from the same file as <span className="font-mono text-[13px]">docs/REFERENCES.json</span> in the repository.</p>
        <p className="mt-3 text-[14px] text-mute">{TEAM_NAME}, {TEAM_CITY}. Challenge: <A href={CHALLENGE_URL}>{CHALLENGE_NAME}</A> (NASA Space Apps 2026). Project licence: {R.license}. Source: <A href={REPO_URL}>{REPO_URL}</A>. Demo video: {hasVideo() ? <A href={VIDEO_URL}>{VIDEO_URL}</A> : <span data-testid="video-pending">to be linked ({VIDEO_URL})</span>}.</p>
        <div className="mt-5"><PageSearch placeholder="Search credits: PSI number, library, font, paper…" testid="credits-search" /></div>
      </header>

      <section id="nasa" className="card space-y-3" data-testid="credits-nasa">
        <h2 className="text-[20px] font-semibold">NASA resources</h2>
        <ul className="space-y-2" data-search-items="Source">
          <li><b>{R.nasa_resource_used.title}</b> (accessed {R.nasa_resource_used.accessed}) <Url u={R.nasa_resource_used.url} /></li>
          {R.apis.filter((a) => isNasa(a.url)).map((a) => <li key={a.name}><b>{a.name}</b>: {a.use} <Url u={a.url} /></li>)}
          {nasaOther.map((s) => <li key={s.id} id={`credit-${s.id}`}><A href={s.url}>{s.title}</A>{s.year ? ` (${s.year})` : ""} <Url u={s.url} /></li>)}
        </ul>
        <h3 className="pt-2 font-semibold">NASA PSI investigations ({R.psi_records.length})</h3>
        <div className="overflow-x-auto"><table className="data w-full min-w-[40rem]">
          <thead><tr><th scope="col">accession</th><th scope="col">investigation</th><th scope="col">used for</th><th scope="col">files used</th></tr></thead>
          <tbody>{R.psi_records.map((p) => (
            <tr key={p.id} id={`credit-${p.id.toLowerCase()}`} data-search-item data-search-kind="NASA dataset" data-search-title={`${p.id} ${p.title}`}>
              <td className="num whitespace-nowrap">{p.id}</td>
              <td><A href={p.url}>{p.title}</A><Url u={p.url} /></td>
              <td className="text-[12px] text-mute">{PSI_USES[p.id] ?? "Catalogued (metadata only)."}</td>
              <td className="text-[12px] text-mute">{p.files_used.length ? p.files_used.join(" · ") : "catalog metadata only"}</td>
            </tr>))}</tbody>
        </table></div>
        <p className="text-[12px] text-faint">NASA data and media are used under NASA&apos;s usage guidelines (<A href={R.media_guidelines}>{R.media_guidelines}</A>); no NASA logo is used and no NASA endorsement is implied.</p>
      </section>

      <section id="papers" className="card space-y-3">
        <h2 className="text-[20px] font-semibold">Other data and papers</h2>
        <ul className="space-y-2" data-search-items="Source">{other.map((s) => <li key={s.id} id={`credit-${s.id}`}><A href={s.url}>{s.title}</A>{s.year ? ` (${s.year})` : ""} <Url u={s.url} /></li>)}</ul>
      </section>

      <section id="ai" className="card space-y-3" data-testid="credits-ai">
        <h2 className="text-[20px] font-semibold">SI tools</h2>
        <ul className="space-y-2" data-search-items="Source">{R.si_tools.map((t) => <li key={t.name}><b>{t.name}</b>: {t.use}{t.disclosure ? ` ${t.disclosure}` : ""} <Url u={t.url ?? R.apis.find((a) => /openai/i.test(a.name) && /openai/i.test(t.name))?.url} /></li>)}</ul>
        <p className="text-[13px] text-mute">{R.si_media}</p>
      </section>

      <section id="software" className="card space-y-3">
        <h2 className="text-[20px] font-semibold">Code libraries ({R.software.length})</h2>
        <div className="overflow-x-auto"><table className="data w-full min-w-[34rem]">
          <thead><tr><th scope="col">library</th><th scope="col">version</th><th scope="col">licence</th><th scope="col">URL</th></tr></thead>
          <tbody>{[...npm, ...py].map((l) => <tr key={`${l.ecosystem}-${l.name}`} data-search-item data-search-kind="Source" data-search-title={`${l.name} (${l.license})`}>
            <td className="font-mono text-[12px]">{l.name}</td><td className="num text-[12px]">{l.version}</td><td className="text-[12px]">{l.license}</td><td><A href={l.url}><span className="break-all font-mono text-[11px]">{l.url}</span></A></td>
          </tr>)}</tbody>
        </table></div>
      </section>

      <section id="design" className="card space-y-3">
        <h2 className="text-[20px] font-semibold">Fonts, components and images</h2>
        <ul className="space-y-2" data-search-items="Source">
          {R.fonts.map((f) => <li key={f.name}><b>{f.name}</b> ({f.license}): {f.use}, {f.via} <Url u={f.url} /></li>)}
          {(R.component_sources ?? []).map((c) => <li key={c.name}><b>{c.name}</b> ({c.license}): {c.use} <Url u={c.url} /></li>)}
          {R.images.map((i) => <li key={i.name}><b>{i.name}</b>, credit {i.credit} ({i.license}): {i.use} <Url u={i.url} /></li>)}
        </ul>
        <p className="text-[12px] text-faint">The 3D cabin is procedural (generated in code); no third-party 3D models are used.</p>
      </section>
      <p className="text-[13px] text-mute">See also <Link className="underline underline-offset-2" href="/methods#references">Methods → References</Link> for the equations behind each source.</p>
    </div>
  );
}
