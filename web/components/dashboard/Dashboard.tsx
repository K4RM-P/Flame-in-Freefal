"use client";
// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { rankEvidence } from "@/lib/sim/evidence";
import { nextTest } from "@/lib/sim/nextTest";
import { replayError } from "@/lib/sim/replay";
import { missingFields } from "@/components/sim/RunPanel";
import { TELEMETRY, materialByKey } from "@/components/sim/data";
import { sig } from "@/lib/ui/format";
import { useSim } from "@/components/sim/store";
import type { Scenario, SimResult } from "@/lib/sim/types";

type Project = { name: string; description: string };
const empty: Project = { name: "", description: "" };

export function Dashboard() {
  const { a, ra, b, rb } = useSim();
  const [project, setProject] = useState<Project>(empty);
  const [editing, setEditing] = useState(false);
  useEffect(() => { try { setProject(JSON.parse(localStorage.getItem("ea.project") ?? "null") ?? empty); } catch { /* empty state */ } }, []);
  const save = (p: Project) => { setProject(p); localStorage.setItem("ea.project", JSON.stringify(p)); setEditing(false); };
  const scenarios = [a, b].filter(Boolean);
  const evidence = useMemo(() => a ? rankEvidence(a) : [], [a]);
  const next = useMemo(() => a && ra ? nextTest(a, ra) : null, [a, ra]);
  const replay = a && ra && a.preset_id?.includes("saffire") && TELEMETRY ? replayError(ra, TELEMETRY) : null;
  const missing = a ? missingFields(a) : [];

  if (!project.name && !editing) return <ProjectEmpty onCreate={() => setEditing(true)} />;
  return <div className="space-y-4" data-testid="dashboard">
    <header className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-3">
      <div><p className="label">PROJECT / FIRE MITIGATION</p><h1 className="display text-[32px]">{project.name || "Untitled project"}</h1><p className="text-[13px] text-mute">{project.description || "No project description supplied."}</p></div>
      <div className="flex gap-2"><Link href="/" className="btn">Add scenario</Link><button type="button" className="btn" onClick={() => setEditing(true)}>Edit project</button></div>
    </header>
    {editing && <ProjectEditor initial={project} onCancel={() => setEditing(false)} onSave={save} />}
    <div className="grid gap-3 md:grid-cols-4">
      <Stat label="Scenarios" value={String(scenarios.length)} note={scenarios.length ? "loaded in this session" : "No scenario loaded"} />
      <Stat label="Run status" value={ra ? "Complete" : "Not run"} note={ra ? "engine result available" : "run a scenario to populate"} />
      <Stat label="Evidence" value={evidence.length ? `${evidence.length} investigations` : "No data"} note={evidence.length ? "ranked from PSI" : "requires a scenario"} />
      <Stat label="Required inputs" value={missing.length ? String(missing.length) : a ? "Complete" : "No data"} note={missing.length ? missing.join(", ") : "no blocker detected"} />
    </div>
    {!a ? <EmptyWorkspace /> : <>
      <div className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
        <section className="panel overflow-hidden"><SectionHead title="Scenario register" action={<Link href="/" className="text-[12px] underline">Open simulator</Link>} />
          <div className="overflow-x-auto"><table className="data w-full"><thead><tr><th>scenario</th><th>material</th><th>simulation</th><th>mitigation</th><th>status</th></tr></thead><tbody>{scenarios.map((s, i) => { const r = i === 0 ? ra : rb; const mat = materialByKey(s!.items[0]?.material_key); return <tr key={`${s!.name}-${i}`}><td>{s!.name}</td><td>{mat?.display_name ?? "No data"}</td><td>{r ? "Complete" : "Not run"}</td><td>{s!.suppression.agent === "none" ? "None configured" : `${s!.suppression.agent} · ${s!.suppression.mass_kg} kg`}</td><td>{r ? "Review" : missingFields(s!).length ? "Required input" : "Ready"}</td></tr>; })}</tbody></table></div>
        </section>
        <section className="panel"><SectionHead title="Fire mitigation matrix" /><Matrix sc={a} r={ra} /></section>
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <section className="panel"><SectionHead title="Risk and evidence" /><Metrics sc={a} r={ra} replay={replay} evidence={evidence} /></section>
        <section className="panel"><SectionHead title="Recommended actions" /><Actions sc={a} r={ra} missing={missing} next={next} /></section>
      </div>
      <Assistant sc={a} r={ra} evidence={evidence} next={next} />
    </>}
  </div>;
}

function ProjectEmpty({ onCreate }: { onCreate: () => void }) { return <main className="mx-auto max-w-3xl py-14"><p className="label">PROJECT / FIRE MITIGATION</p><h1 className="display mt-3 text-[clamp(2.4rem,7vw,5rem)] leading-none">No project yet.</h1><p className="measure mt-4 text-[16px] text-mute">Create a project to organize cabin scenarios, mitigation readiness, evidence coverage, and next tests. Nothing is preloaded.</p><button type="button" className="btn-accent mt-7 px-5 py-3" onClick={onCreate}>Create project →</button></main>; }
function ProjectEditor({ initial, onCancel, onSave }: { initial: Project; onCancel: () => void; onSave: (p: Project) => void }) { const [p, setP] = useState(initial); return <section className="panel grid gap-3 p-4 md:grid-cols-[1fr_2fr_auto]"><input aria-label="Project name" placeholder="Project name" value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} /><input aria-label="Project description" placeholder="What decision is this project supporting?" value={p.description} onChange={(e) => setP({ ...p, description: e.target.value })} /><div className="flex gap-2"><button className="btn-accent px-3" disabled={!p.name.trim()} onClick={() => onSave(p)}>Save</button><button className="btn" onClick={onCancel}>Cancel</button></div></section>; }
function EmptyWorkspace() { return <section className="panel p-6"><p className="label">SCENARIOS</p><h2 className="mt-2 text-[22px] font-semibold">Add your first scenario</h2><p className="mt-1 max-w-xl text-[13px] text-mute">Use the simulator to enter variables manually or have the AI draft a reviewable scenario. The dashboard will populate from actual runs.</p><Link href="/" className="btn-accent mt-4 inline-block px-4 py-2">Open simulator →</Link></section>; }
function Stat({ label, value, note }: { label: string; value: string; note: string }) { return <section className="panel p-3"><p className="label">{label}</p><p className="num mt-2 text-[22px]">{value}</p><p className="mt-1 text-[11px] text-mute">{note}</p></section>; }
function SectionHead({ title, action }: { title: string; action?: React.ReactNode }) { return <div className="flex items-center justify-between border-b border-line px-3 py-3"><h2 className="text-[16px] font-semibold">{title}</h2>{action}</div>; }
function State({ children, tone = "text-mute" }: { children: React.ReactNode; tone?: string }) { return <span className={`text-[12px] ${tone}`}>{children}</span>; }
function Matrix({ sc, r }: { sc: Scenario; r: SimResult | null }) { const mat = materialByKey(sc.items[0]?.material_key); return <div className="grid grid-cols-2 gap-2 p-3 text-[12px]">{[["Detection", sc.detection.threshold == null ? "Required input" : r ? "Configured" : "Ready", sc.detection.threshold == null ? "text-warn" : "text-ok"], ["Ventilation", `${sig(sc.cabin.flow_m_s * 100)} cm/s`, "text-mute"], ["Suppression", sc.suppression.agent === "none" ? "None configured" : sc.suppression.agent, sc.suppression.agent === "none" ? "text-warn" : "text-ok"], ["Material", mat?.ignitable ? "PSI burn data" : mat?.has_smoke_data ? "Smoke-only" : "No data", mat?.ignitable ? "text-ok" : "text-theory"]].map(([label, value, tone]) => <div key={String(label)} className="border border-line p-2"><p className="text-mute">{label}</p><State tone={String(tone)}>{String(value)}</State></div>)}</div>; }
function Metrics({ sc, r, replay, evidence }: { sc: any; r: any; replay: any; evidence: any[] }) { const metric = (key: string) => r?.outcome.metrics.find((m: any) => m.key === key); const rows = [["Peak temperature", "peak_T", "K"], ["Minimum O₂", "min_o2", "Pa"], ["Peak CO", "peak_co", "mol/mol"], ["Peak CO₂", "peak_co2", "mol/mol"], ["Time to alarm", "time_to_alarm", "s"], ["Time to extinguish", "time_to_extinguish", "s"]]; return <div className="p-3"><div className="grid grid-cols-2 gap-x-5 gap-y-2">{rows.map(([label, key, unit]) => { const m = metric(key); return <div key={key} className="flex justify-between gap-2 border-b border-line py-1 text-[12px]"><span className="text-mute">{label}</span><span className="num">{m?.value == null ? "No data" : `${sig(m.value)} ${unit}`}</span></div>; })}</div><div className="mt-4 flex flex-wrap gap-1">{evidence.slice(0, 6).map((e) => <a className="chip border border-line text-[11px]" href={e.url} target="_blank" rel="noreferrer" key={e.accession}>{e.accession}</a>)}</div>{replay && <p className="mt-3 text-[12px] text-mute">Saffire replay: RMSE/MAPE computed for available PSI-100 channels. O₂: No data.</p>}</div>; }
function Actions({ sc, r, missing, next }: { sc: any; r: any; missing: string[]; next: any }) { const actions = [...missing.map((x) => ({ text: `Provide ${x} before running.`, why: "Required scenario input." })), ...(r?.warnings ?? []).slice(0, 4).map((x: string) => ({ text: x, why: "Engine warning from this run." }))]; if (next) actions.push({ text: `Next test: ${next.condition}`, why: next.why }); if (!actions.length) actions.push({ text: "No additional action generated.", why: "No warnings, missing inputs, or next-test gap is available." }); return <ul className="space-y-2 p-3 text-[12px]">{actions.map((a: any, i) => <li key={i} className="border-b border-line pb-2"><p>{a.text}</p><p className="text-mute">{a.why}</p></li>)}</ul>; }
function Assistant({ sc, r, evidence, next }: { sc: any; r: any; evidence: any[]; next: any }) { const [q, setQ] = useState(""); const [answer, setAnswer] = useState<string | null>(null); const [error, setError] = useState<string | null>(null); const [busy, setBusy] = useState(false); async function ask() { if (!r || !q.trim()) return; setBusy(true); setError(null); try { const res = await fetch("/api/interpret", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scenario: sc, result: r, question: q, evidence, next_test: next }) }); const body = await res.json(); if (!res.ok) throw new Error(body.error ?? `Request failed (${res.status})`); setAnswer(body.text); } catch (e) { setError(e instanceof Error ? e.message : "AI unavailable"); } finally { setBusy(false); } } return <section className="panel"><SectionHead title="AI project assistant" /><div className="space-y-3 p-3"><p className="text-[12px] text-mute">Ask about the current run. Answers use only this scenario, its engine result, and ranked PSI evidence.</p><div className="flex gap-2"><input className="min-w-0 flex-1" placeholder={r ? "Why did this outcome occur?" : "Run a scenario to ask about its output"} value={q} onChange={(e) => setQ(e.target.value)} disabled={!r} /><button className="btn" onClick={ask} disabled={!r || busy || !q.trim()}>{busy ? "Thinking…" : "Ask"}</button></div>{error && <p className="text-[12px] text-warn" role="alert">{error}</p>}{answer && <p className="measure whitespace-pre-line text-[13px]">{answer}</p>}</div></section>; }
