"use client";
// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
import { materialById } from "@/lib/ui/materials";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import type { ReviewData, TestPoint } from "@/lib/contracts";
import { buildReview, type Answer, type Review } from "@/lib/review";
import { briefMarkdown, LIMITATION_PG } from "@/lib/review/brief";
import { useMission, toUrl } from "@/lib/store";
import { MISSIONS, GRAVITY_PRESETS } from "@/lib/missions";
import { psia, sig } from "@/lib/ui/format";
import { ACCENT, OKABE_ITO } from "@/lib/ui/palette";
import { download } from "@/lib/report";
import { Plot } from "@/components/Plot";
import { Segmented } from "@/components/ui-kit";
import { ReceiptDrawer } from "@/components/review/ReceiptDrawer";
import pkg from "@/package.json";
import { AtmosphereEvidence } from "@/components/AtmosphereEvidence";

const VERDICT_TONE: Record<Review["verdict"]["kind"], string> = {
  pending: "border-line text-mute", likely: "border-bad text-bad", marginal: "border-warn text-warn",
  acceptable: "border-ok text-ok", no_burn_data: "border-line text-mute border-dashed",
};
const FLOW_MIN = 0.5;
const PG_IDS = new Set(["moon", "mars"]);

export function ReviewScreen({ data }: { data: ReviewData }) {
  const preset = useMission((s) => s.preset);
  const material = useMission((s) => s.material) || "sibal";
  const m = MISSIONS.find((q) => q.id === preset) ?? MISSIONS.find((q) => q.id === "LunarHabitat") ?? MISSIONS[0];
  const mission = useMemo(() => ({ id: m.id, name: m.name, x_o2: m.x_o2, P_kPa: m.P_kPa, gravity_g: m.gravity_g, flow_cm_s: m.flow_cm_s }), [m]);
  const review = useMemo(() => buildReview(material, mission, data, { fallbackName: materialById(material).name }), [material, mission, data]);
  const [open, setOpen] = useState<string | null>(null);
  const close = useCallback(() => setOpen(null), []);
  const [menu, setMenu] = useState(false);
  const initialG = GRAVITY_PRESETS.find((g) => g.g === m.gravity_g)?.id ?? "ug";
  const [gview, setGview] = useState<string>(initialG);
  const v = review.verdict;
  const matLabel = review.material?.display_name ?? materialById(material).name;

  const exportMd = () => {
    const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/review?${toUrl(useMission.getState())}` : "/review";
    const md = briefMarkdown(review, { date: new Date().toISOString().slice(0, 10), version: pkg.version, shareUrl });
    download(`emberatlas-evidence-brief-${material}-${mission.id}.md`, md);
    setMenu(false);
  };

  return (
    <div className="space-y-8" data-testid="review">
      {/* a) header */}
      <header className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-[13px]">
          <Link href="/start" className="btn" data-testid="pill-cabin">
            Cabin: {m.name} <span className="num">{sig(m.x_o2 * 100, 3)}%</span> · <span className="num">{sig(psia(m.P_kPa), 3)}</span> psia · <span className="num">{m.gravity_g === 0 ? "µg" : `${m.gravity_g} g`}</span>
          </Link>
          <Link href="/start" className="btn" data-testid="pill-material">Material: {matLabel}</Link>
          <div className="relative ml-auto" data-noprint>
            <button className="btn-accent" data-testid="export-brief" aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu((x) => !x)}>Export Evidence Brief</button>
            {menu && (
              <div role="menu" className="absolute right-0 z-40 mt-1 flex flex-col border border-line bg-panel p-1 shadow-xl" style={{ borderRadius: 6 }}>
                <button role="menuitem" className="btn border-0" data-testid="export-pdf" onClick={() => { setMenu(false); window.print(); }}>PDF</button>
                <button role="menuitem" className="btn border-0" data-testid="export-md" onClick={exportMd}>Markdown</button>
              </div>
            )}
          </div>
        </div>
        <span className={`chip border ${VERDICT_TONE[v.kind]}`} data-testid="verdict-chip">{v.label}</span>
        <h1 className="measure text-[24px] font-semibold leading-snug md:text-[32px]" data-testid="verdict-sentence">
          {v.kind === "pending" ? "Verified PSI solid-material data has not landed yet. No verdict is shown until it does." : v.sentence}
        </h1>
        {v.kind === "pending" && <p className="text-[13px] text-mute">{v.sentence}</p>}
      </header>

      {/* b) answer cards */}
      <section className="grid gap-4 md:grid-cols-3">
        <AnswerCard n={1} title="Q1 Will it burn here?" a={review.q1} onOpen={setOpen} />
        <AnswerCard n={2} title="Q2 If it burns, how bad?" a={review.q2} onOpen={setOpen} />
        <AnswerCard n={3} title="Q3 Can we catch it and stop it?" a={review.q3} onOpen={setOpen} />
      </section>

      {/* c) hero map */}
      <HeroMap review={review} gview={gview} setGview={setGview} />

      {/* d) earth vs orbit */}
      <section className="card space-y-3" data-testid="earth-vs-orbit">
        <h2 className="text-[16px] font-semibold">Earth test vs orbit</h2>
        {review.earthVsOrbit.state === "pending" ? <p className="text-mute">∅ Data pending</p>
          : review.earthVsOrbit.state === "none" ? <p className="text-mute">∅ No like-for-like orbit comparison yet → see Next test.</p>
          : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead className="text-left text-mute"><tr>{["1 g", "µg", "Conditions", "Agreement", "n"].map((h) => <th key={h} className="py-1 pr-3 font-medium">{h}</th>)}</tr></thead>
                <tbody>
                  {review.earthVsOrbit.rows.map((r, i) => (
                    <tr key={i} className="border-t border-line">
                      <td className="py-1 pr-3">{sym(r.one_g.outcome)}</td>
                      <td className="py-1 pr-3">{sym(r.ug.outcome)}</td>
                      <td className="py-1 pr-3"><span className="num">{sig(r.thickness_mm, 3)}</span> mm · <span className="num">{r.ug.x_o2 != null ? sig(r.ug.x_o2 * 100, 3) : "—"}%</span> O₂ · <span className="num">{sig(r.ug.flow_cm_s ?? null, 3)}</span> cm/s <span className="text-mute">({r.source_id})</span></td>
                      <td className="py-1 pr-3"><span className={`chip border ${r.agreement === "same" ? "border-ok text-ok" : r.agreement === "orbit_worse" ? "border-bad text-bad" : "border-line text-mute"}`}>{r.agreement.replace("_", " ")}</span></td>
                      <td className="num py-1 pr-3">{r.n}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        <p className="text-[12px] text-mute">{review.earthVsOrbit.caveat}{" "}
          <Link href="/evidence#earth-vs-orbit" className="underline underline-offset-2" data-testid="link-earth-vs-orbit">How does this compare to the Earth test, all materials (SAFFIRE-II, PSI-99)? →</Link></p>
      </section>
      <AtmosphereEvidence />

      {/* e) what to do + next test */}
      <section className="grid gap-4 md:grid-cols-2">
        <div className="card space-y-3" data-testid="what-to-do">
          <h2 className="text-[16px] font-semibold">What to do</h2>
          {review.actions.length === 0 ? <p className="text-mute">∅ Data pending</p> : (
            <ul className="space-y-2">{review.actions.map((a) => (
              <li key={a.kind}><span className="label mr-2">{a.kind}</span>{a.text}{a.chips.length > 0 && <span className="ml-1">{a.chips.map((c) => <EvChip key={c} id={c} />)}</span>}</li>
            ))}</ul>
          )}
        </div>
        <div className="card space-y-2" data-testid="next-test">
          <h2 className="text-[16px] font-semibold">Next test to fly</h2>
          {review.nextTest.state === "pending" && <p className="text-mute">∅ Data pending</p>}
          <p><span className="label mr-2">Condition</span>{review.nextTest.condition}</p>
          <p><span className="label mr-2">Why</span>{review.nextTest.why}</p>
          <p><span className="label mr-2">Rig</span>{review.nextTest.rig}</p>
        </div>
      </section>

      {/* f) evidence used */}
      <section className="card space-y-3" data-testid="evidence-used">
        <h2 className="text-[16px] font-semibold">Evidence used</h2>
        {review.evidence.length === 0 ? <p className="text-mute">∅ Data pending</p> : (
          <ul className="space-y-2">{review.evidence.map((e) => (
            <li key={e.key}>
              {e.url ? <a href={e.url} target="_blank" rel="noreferrer" className="underline underline-offset-2">{e.accession}</a>
                : <Link href={`/evidence#${e.key}`} className="underline underline-offset-2">{e.accession}</Link>}
              {" "}{e.title} <span className="text-mute">— {e.why}</span>{e.doi && <span className="num ml-1 text-mute">DOI {e.doi}</span>}
            </li>
          ))}</ul>
        )}
      </section>

      <aside className="border border-dashed border-line p-4 text-[13px]" data-testid="limitations">
        <p className="label">Limitations</p>
        <p>{LIMITATION_PG}</p>
        <ul className="list-disc pl-5 text-mute">{v.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
      </aside>

      <ReceiptDrawer receipt={open ? review.receipts[open] ?? null : null} onClose={close} />
    </div>
  );
}

function sym(o: string | null | undefined) {
  return o === "burn" ? "● burn" : o === "extinct" ? "✕ extinct" : o === "insignificant" || o === "no_ignition" ? `◇ ${o.replace("_", " ")}` : o ?? "—";
}

function EvChip({ id }: { id: string }) {
  return <span className="chip mr-1 border border-line text-mute">{id}</span>;
}

function AnswerCard({ n, title, a, onOpen }: { n: number; title: string; a: Answer; onOpen: (id: string) => void }) {
  const empty = a.state === "pending" || a.state === "nodata";
  return (
    <article className="card flex flex-col gap-2 break-inside-avoid" data-testid={`card-q${n}`}>
      <h2 className="text-[14px] font-semibold text-mute">{title}</h2>
      {a.receipt ? (
        <button className="num self-start text-left text-[24px] font-semibold underline decoration-line underline-offset-4" data-receipt={a.receipt} onClick={() => onOpen(a.receipt as string)}>{a.big}</button>
      ) : (
        <p className={`text-[20px] font-semibold ${empty ? "text-mute" : ""} ${a.state === "theory" ? "border-b border-dashed border-line" : ""}`}>{empty && !a.big.startsWith("∅") ? `∅ ${a.big}` : a.big}</p>
      )}
      {a.range && <p className="num text-[13px] text-mute">{a.range}</p>}
      <p className="text-[13px]">{a.line}</p>
      {a.chips.length > 0 && <div>{a.chips.map((c) => <EvChip key={c} id={c} />)}</div>}
      <div className="mt-auto pt-2" data-noprint>
        <button className="btn" data-testid={`show-work-q${n}`} disabled={!a.receipt} onClick={() => a.receipt && onOpen(a.receipt)}>
          Show your work{!a.receipt ? " (no receipt)" : ""}
        </button>
      </div>
    </article>
  );
}

function HeroMap({ review, gview, setGview }: { review: Review; gview: string; setGview: (g: string) => void }) {
  const pts = review.orbitPoints;
  const fx = (t: TestPoint) => Math.max(FLOW_MIN, t.flow_cm_s ?? FLOW_MIN);
  const groups = [
    { name: "● burned", sym: "circle", color: OKABE_ITO[5], pts: pts.filter((t) => t.outcome === "burn") },
    { name: "✕ extinct", sym: "x-thin", color: OKABE_ITO[4], pts: pts.filter((t) => t.outcome === "extinct") },
    { name: "◇ insignificant / no ignition", sym: "diamond-open", color: OKABE_ITO[1], pts: pts.filter((t) => t.outcome === "insignificant" || t.outcome === "no_ignition") },
  ].filter((g) => g.pts.length);
  const gp = GRAVITY_PRESETS.find((g) => g.id === gview) ?? GRAVITY_PRESETS[0];
  const bounded = PG_IDS.has(gp.id);
  const mx = Math.max(FLOW_MIN, review.mission.flow_cm_s), my = review.mission.x_o2 * 100;
  return (
    <section className="panel space-y-2 p-4" data-testid="hero-map">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[16px] font-semibold">Where this material burned in orbit</h2>
        <div className="flex items-center gap-2" data-noprint>
          <Segmented testid="gravity-toggle" value={gview} onChange={setGview}
            options={GRAVITY_PRESETS.map((g) => ({ v: g.id, label: g.label, testid: `g-${g.id}` }))} />
          {bounded && <span className="chip border border-dashed border-line text-mute">bounded estimate</span>}
        </div>
      </div>
      <Plot height={420} label="Flammability map: O2 versus flow for verified ISS tests, with mission marker"
        data={[
          ...groups.map((g) => ({ type: "scatter" as const, mode: "markers" as const, name: g.name, x: g.pts.map(fx), y: g.pts.map((t) => t.x_o2 * 100),
            text: g.pts.map((t) => `${t.id} · ${t.investigation_id} · ${t.outcome}`), hoverinfo: "text" as const,
            marker: { symbol: g.sym, size: 9, color: g.color, line: { color: g.color, width: 1.5 } } })),
          { type: "scatter" as const, mode: "markers" as const, name: `mission (${gp.label}${bounded ? ", bounded estimate" : ""})`, x: [mx], y: [my],
            marker: { symbol: "cross-thin", size: 22, color: ACCENT, line: { color: ACCENT, width: 3 } }, hoverinfo: "name" as const },
        ]}
        layout={{
          xaxis: { type: "log", title: { text: "flow (cm/s, log)" } },
          yaxis: { title: { text: "O₂ (mole %)" } },
          showlegend: true, legend: { orientation: "h", y: -0.2 },
          annotations: pts.length ? [] : [{ text: "No verified ISS points for this material yet.", xref: "paper", yref: "paper", x: 0.5, y: 0.5, showarrow: false }],
        }} />
      {pts.length === 0 && <p className="text-[13px] text-mute">∅ No verified ISS points for this material yet.</p>}
      <p className="text-[13px] text-mute">Each mark is one verified ISS (µg) test of this material; the gravity toggle moves only the mission label{bounded ? " (partial gravity is a bounded estimate, not measured)" : ""}, never the verdict.</p>
    </section>
  );
}
