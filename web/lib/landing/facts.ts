// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Every number on the landing page comes from here: shipped data files (web/data) or a real engine run of the
// "iss-vs-lunar" preset (same seed and Monte Carlo size as the simulator). Presentation layer only — no constants.
import { durationVerdict } from "@/lib/sim/endReason";
import tablesIndex from "@/data/psi/tables_index.json";
import flexCrosscheck from "@/data/psi/flex_crosscheck.json";
import dropletK from "@/data/validation/droplet_K.json";
import spreadCal from "@/data/params/spread.json";
import catalog from "@/data/psi_catalog.json";
import { earthVsOrbitSummary, evidenceStops, rankEvidence } from "@/lib/sim/evidence";
import { presetById } from "@/lib/sim/presets";
import { simulate } from "@/lib/sim/engine";
import { nextTest, outOfEnvelope } from "@/lib/sim/nextTest";
import { designReview, show } from "@/lib/sim/designReview";
import { MC_N } from "@/components/sim/constants";
import type { Scenario, SimResult } from "@/lib/sim/types";

type Table = { key: string; rows: number; accessions: string[]; files: string[] };
const TABLES = tablesIndex as Table[];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CAT: Record<string, any> = (catalog as any).investigations ?? {};

export interface Chip { accession: string; name: string; rows: number }

export interface LandingFacts {
  psi: { accessions: number; rows: number; tables: number; chips: Chip[] };
  flex: { mismatches: number; compared: number; mape: number; n: number };
  spread: { mape: number | null; n: number };
  orbit: { better: number; same: number; worse: number; n: number };
  stops: { maxSolid: number | null; mission: number; P_kPa: number; gravity: number; note: string; materials: { name: string; max: number | null }[] };
  run: {
    aName: string; bName: string;
    burnA: number | null; burnB: number | null; units: string; ratio: number | null; longer: string | null; endA: string; endB: string;
    extrapolated: string[];
    next: { condition: string; reason: string } | null;
    front: { t: number[]; a: number[]; b: number[] } | null;
    ignitionS: number | null; alarmS: number | null;
    evidence: { accession: string; title: string; role: string }[];
    fixes: { title: string; before: string; after: string; basis: string; effect: number }[];
  } | null;
}

const metric = (r: SimResult, k: string) => r.outcome.metrics.find((m) => m.key === k) ?? null;

function chips(): Chip[] {
  const seen = new Map<string, Chip>();
  for (const t of TABLES) for (const acc of t.accessions) {
    const c = CAT[acc];
    const name = (c?.short_name ?? c?.acronym ?? c?.title ?? t.key).toString();
    const prev = seen.get(acc);
    seen.set(acc, { accession: acc, name: prev?.name ?? name, rows: (prev?.rows ?? 0) + t.rows });
  }
  return [...seen.values()].sort((x, y) => Number(x.accession.slice(4)) - Number(y.accession.slice(4)));
}

function engineRun(): LandingFacts["run"] {
  const p = presetById("iss-vs-lunar");
  if (!p || p.required.length) return null;
  const built = p.build() as { a: Scenario; b: Scenario };
  if (!("a" in built)) return null;
  const { a, b } = built;
  const ra = simulate(a, { mc: MC_N }), rb = simulate(b, { mc: MC_N });
  const ma = metric(ra, "time_to_extinguish"), mb = metric(rb, "time_to_extinguish");
  const va = ma?.value ?? null, vb = mb?.value ?? null;
  const dv = durationVerdict(a.name, ra, b.name, rb);
  const ratio = dv.ratio;
  const seen = new Set<string>();
  const extrapolated = [...outOfEnvelope(b), ...outOfEnvelope(a)].map((o) => o.text).filter((t) => (seen.has(t) ? false : (seen.add(t), true)));
  const nt = nextTest(b, rb);
  // Flame front of the igniting item (engine trace), decimated for a mini strip.
  const fa = ra.items[0]?.front_m, fb = rb.items[0]?.front_m;
  const step = Math.max(1, Math.ceil(ra.t.length / 48));
  const front = fa && fb ? { t: ra.t.filter((_, i) => i % step === 0), a: fa.filter((_, i) => i % step === 0), b: fb.filter((_, i) => i % step === 0) } : null;
  const ev = (k: string) => rb.events.find((e) => e.kind === k)?.t_s ?? null;
  // "Prevent": the deterministic design review (rule-based gaps + largest sensitivity swings), top 3.
  const fixes = designReview(b, rb).slice(0, 3).map((x) => ({ title: x.title, before: show(x.before, x.units), after: show(x.after, x.units), basis: x.basis, effect: Math.abs(x.effect) }));
  return {
    aName: a.name, bName: b.name, burnA: va, burnB: vb, units: ma?.units ?? "s", ratio, longer: dv.longer, endA: dv.ea.short, endB: dv.eb.short,
    extrapolated, next: nt ? { condition: nt.condition, reason: nt.reason } : null, front,
    ignitionS: ev("ignition"), alarmS: ev("alarm"),
    evidence: rankEvidence(b).slice(0, 3).map((e) => ({ accession: e.accession, title: e.short_name || e.title, role: e.role[0] ?? "" })),
    fixes,
  };
}

let cache: LandingFacts | null = null;
export function landingFacts(): LandingFacts {
  if (cache) return cache;
  const orbit = earthVsOrbitSummary().counts;
  const stops = evidenceStops("LunarHabitat");
  const flex = flexCrosscheck as { values_compared: number; mismatches: unknown[] };
  const m = (dropletK as { metrics: { n: number; mape: number } }).metrics;
  const sp = spreadCal as { metrics?: { test_mape_pct?: number; test?: unknown[] } };
  const c = chips();
  cache = {
    psi: { accessions: c.length, rows: TABLES.reduce((s, t) => s + t.rows, 0), tables: TABLES.length, chips: c },
    flex: { mismatches: flex.mismatches.length, compared: flex.values_compared, mape: m.mape, n: m.n },
    spread: { mape: sp.metrics?.test_mape_pct ?? null, n: sp.metrics?.test?.length ?? 0 },
    orbit: { better: orbit.better, same: orbit.same, worse: orbit.worse, n: orbit.n },
    stops: {
      maxSolid: stops.max_solid_x_o2, mission: stops.mission.x_o2, P_kPa: stops.mission.P_Pa / 1000, gravity: stops.mission.gravity_g, note: stops.bre_note,
      materials: stops.rows.map((r) => ({ name: r.display_name, max: r.o2_range?.[1] ?? null })),
    },
    run: (() => { try { return engineRun(); } catch { return null; } })(),
  };
  return cache;
}
