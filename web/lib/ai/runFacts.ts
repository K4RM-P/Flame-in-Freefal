// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Run facts for Aster: a compact, JSON-safe digest of the scenario(s) and engine result(s) currently on screen. Every
// number is copied from the engine result, the design review, the evidence ranking or a sourced data file; nothing
// is computed here except unit conversions (Pa → kPa, fraction → %), which the numeric guard allows.
import { designReview, show } from "@/lib/sim/designReview";
import { durationVerdict, fireEnd, quenchLimit } from "@/lib/sim/endReason";
import { rankEvidence } from "@/lib/sim/evidence";
import { nextTest, outOfEnvelope } from "@/lib/sim/nextTest";
import { MATERIALS } from "@/lib/sim/params";
import type { Scenario, SimResult } from "@/lib/sim/types";
import sources from "@/data/sources.json";
import type { RunFacts, SideFacts } from "./runFactsSchema";
export type { RunFacts, SideFacts } from "./runFactsSchema";

const FM2_ID = "ntrs-20240015307";
const metric = (r: SimResult, k: string) => r.outcome.metrics.find((m) => m.key === k)?.value ?? null;
const ev = (r: SimResult, k: string) => r.events.find((e) => e.kind === k)?.t_s ?? null;
const r3 = (x: number | null) => (x === null ? null : Number(x.toPrecision(4)));

export function sideFacts(s: Scenario, r: SimResult): SideFacts {
  const it = s.items.find((i) => i.ignite) ?? s.items[0];
  const m = MATERIALS.find((x) => x.material_key === it?.material_key);
  const minPo2 = metric(r, "min_o2");
  const nt = nextTest(s, r);
  let fixes: SideFacts["fixes"] = [];
  try { fixes = designReview(s, r).slice(0, 3).map((f) => ({ title: f.title.slice(0, 200), before: show(f.before, f.units), after: show(f.after, f.units), basis: f.basis })); } catch { fixes = []; }
  return {
    label: s.name.slice(0, 120),
    material: (m?.display_name ?? it?.material_key ?? "no material").slice(0, 120), thickness_mm: r3((it?.thickness_m ?? 0) * 1e3) ?? 0,
    material_max_o2_pct: m?.o2_range ? r3(m.o2_range[1] * 100) : null,
    x_o2_pct: r3(s.cabin.x_o2 * 100)!, P_kPa: r3(s.cabin.P_Pa / 1e3)!, gravity_g: s.cabin.gravity_g, flow_cm_s: r3(s.cabin.flow_m_s * 100)!, V_m3: s.cabin.V_m3,
    end: fireEnd(r),
    peak_heat_W: r3(r.state.reduce((a, x) => Math.max(a, x.Q_W), 0))!,
    peak_T_K: r3(metric(r, "peak_T")), min_ppO2_kPa: minPo2 === null ? null : r3(minPo2 / 1e3), peak_CO2_pct: r3((metric(r, "peak_co2") ?? 0) * 100),
    alarm_s: ev(r, "alarm"), fan_off_s: ev(r, "fan_off"), agent_s: ev(r, "agent_released"), agent: s.suppression.agent, agent_kg: s.suppression.mass_kg,
    extrapolated: outOfEnvelope(s).slice(0, 8).map((o) => o.text.slice(0, 300)),
    material_sources: [...new Set((m?.sources ?? []).map((x) => String(x.source_id ?? "")).filter((x) => /^PSI-\d+$/.test(x)))].slice(0, 4),
    evidence: rankEvidence(s).slice(0, 4).map((e) => ({ accession: e.accession, title: (e.short_name || e.title).slice(0, 140), role: (e.role[0] ?? "").slice(0, 40) })),
    fixes,
    next_test: nt ? { condition: nt.condition.slice(0, 300), rig: nt.rig.slice(0, 400), investigations: nt.investigations.slice(0, 6) } : null,
  };
}

export function buildRunFacts(a: Scenario, ra: SimResult, b?: Scenario | null, rb?: SimResult | null): RunFacts {
  const fm2 = (sources as Record<string, { title?: string; url?: string; note?: string }>)[FM2_ID] ?? {};
  const q = quenchLimit();
  const dv = b && rb ? durationVerdict(a.name, ra, b.name, rb) : null;
  return {
    sides: [sideFacts(a, ra), ...(b && rb ? [sideFacts(b, rb)] : [])],
    compare: dv && dv.ratio !== null && dv.longer ? { ratio: r3(dv.ratio)!, longer: dv.longer.slice(0, 120), shorter: (dv.longer === a.name ? b!.name : a.name).slice(0, 120) } : null,
    quench: { cm_s: q.cm_s, source: q.source.slice(0, 60), status: q.status.slice(0, 30), note: q.note.slice(0, 300) },
    fm2: { id: FM2_ID, url: (fm2.url ?? "").slice(0, 120), title: (fm2.title ?? "FM2").slice(0, 160), note: (fm2.note ?? "").slice(0, 400) },
  };
}
