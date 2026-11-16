// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Markdown exports: (1) a run report (inputs, outcomes with Monte Carlo bands, why each fire ended, events, caveats,
// evidence and sources) and (2) a one-page next-test brief that turns "outside the PSI envelope" into a concrete
// proposed experiment. Every number is copied from the engine result or a data file; nothing is estimated here.
import catalog from "@/data/psi_catalog.json";
import { fireEnd, quenchLimit } from "./endReason";
import { rankEvidence } from "./evidence";
import { nextTest, outOfEnvelope } from "./nextTest";
import { MATERIALS, SOLID_ENVELOPE } from "./params";
import type { Scenario, SimResult } from "./types";
import { PARTIAL_G_CAVEAT, PARTIAL_G_SOURCE } from "./wording";
import { sig } from "@/lib/ui/format";

const CAT = (catalog as { investigations: Record<string, { title: string; short_name?: string; psi_url?: string }> }).investigations;
const s3 = (x: number | null | undefined, units = "") => (x == null || !Number.isFinite(x) ? "—" : `${sig(x, 3)}${units ? ` ${units}` : ""}`);
const esc = (s: string) => s.replace(/\|/g, "\\|").replace(/\n/g, " ");
const matName = (k: string | undefined) => MATERIALS.find((m) => m.material_key === k)?.display_name ?? k ?? "—";
const psiLink = (acc: string) => { const c = CAT[acc]; return c ? `${acc} ${c.short_name || c.title}${c.psi_url ? ` (${c.psi_url})` : ""}` : acc; };

function inputsTable(sides: { s: Scenario }[]): string {
  const rows: [string, (s: Scenario) => string][] = [
    ["O₂ (mole fraction)", (s) => `${s3(s.cabin.x_o2 * 100)} %`], ["Pressure", (s) => s3(s.cabin.P_Pa / 1e3, "kPa")],
    ["Gravity", (s) => (s.cabin.gravity_g === 0 ? "µg" : s3(s.cabin.gravity_g, "g"))], ["Air flow", (s) => s3(s.cabin.flow_m_s * 100, "cm/s")],
    ["Cabin volume", (s) => s3(s.cabin.V_m3, "m³")], ["Fan off on alarm", (s) => (s.cabin.fan_off_on_alarm ? "yes" : "no")],
    ["Material (ignited)", (s) => matName((s.items.find((i) => i.ignite) ?? s.items[0])?.material_key)],
    ["Sample", (s) => { const i = s.items.find((x) => x.ignite) ?? s.items[0]; return i ? `${s3(i.length_m * 100)} × ${s3(i.width_m * 100)} cm, ${s3(i.thickness_m * 1e3)} mm` : "—"; }],
    ["Detector threshold", (s) => (s.detection.threshold === null ? "No data (unsourced)" : s3(s.detection.threshold, "kg/m³"))],
    ["Crew detection (design input)", (s) => (s.detection.manual_alarm_s == null ? "not set" : s3(s.detection.manual_alarm_s, "s"))],
    ["Extinguisher", (s) => (s.suppression.agent === "none" ? "none" : `${s3(s.suppression.mass_kg, "kg")} ${s.suppression.agent}, ${s3(s.suppression.delay_s, "s")} after alarm`)],
  ];
  const head = `| Input | ${sides.map(({ s }) => esc(s.name)).join(" | ")} |\n|---|${sides.map(() => "---|").join("")}`;
  return [head, ...rows.map(([l, f]) => `| ${l} | ${sides.map(({ s }) => esc(f(s))).join(" | ")} |`)].join("\n");
}

function outcomeTable(sides: { s: Scenario; r: SimResult }[]): string {
  const keys = sides[0].r.outcome.metrics.map((m) => m.key);
  const head = `| Outcome | ${sides.map(({ s }) => esc(s.name)).join(" | ")} |\n|---|${sides.map(() => "---|").join("")}`;
  const cell = (r: SimResult, k: string) => {
    const m = r.outcome.metrics.find((x) => x.key === k);
    if (!m) return "—";
    const v = m.value === null ? (k === "time_to_extinguish" ? "still burning" : "none") : s3(m.value, m.units);
    return `${v}${m.band ? ` (p05–p95 ${s3(m.band.p05)}–${s3(m.band.p95)})` : ""}${m.theory_only && !m.label.includes("theory-only") ? " · theory-only" : ""}`;
  };
  const label = (k: string) => sides[0].r.outcome.metrics.find((x) => x.key === k)?.label ?? k;
  const q = (r: SimResult) => s3(r.state.reduce((a, x) => Math.max(a, x.Q_W), 0), "W");
  return [head, ...keys.map((k) => `| ${esc(label(k))} | ${sides.map(({ r }) => esc(cell(r, k))).join(" | ")} |`), `| Peak heat release | ${sides.map(({ r }) => q(r)).join(" | ")} |`,
    `| How the fire ended | ${sides.map(({ r }) => esc(fireEnd(r).phrase)).join(" | ")} |`].join("\n");
}

export function runReportMarkdown(a: Scenario, ra: SimResult, b?: Scenario | null, rb?: SimResult | null, link?: string): string {
  const sides = [{ s: a, r: ra }, ...(b && rb ? [{ s: b, r: rb }] : [])];
  const out: string[] = [];
  out.push(`# EmberAtlas run report: ${sides.map(({ s }) => s.name).join(" vs ")}`, "");
  out.push(`Engine ${ra.provenance.engine_version} · seed ${ra.provenance.seed} · deterministic (same inputs and seed give the same numbers).${link ? ` Re-open and re-run: ${link}` : ""}`, "");
  out.push("> Simulation, not a measurement. Not for flight certification. Every number below comes from the EmberAtlas engine run or a sourced data file.", "");
  out.push("## Inputs", "", inputsTable(sides), "");
  out.push("## Outcomes", "", outcomeTable(sides), "");
  for (const { s, r } of sides) {
    out.push(`## ${s.name}: timeline`, "", ...r.events.map((e) => `- t = ${s3(e.t_s, "s")} · ${e.kind.replace(/_/g, " ")}: ${e.detail}`), "");
    const oob = outOfEnvelope(s);
    if (oob.length) out.push(`**Extrapolated** (outside NASA's tested range): ${oob.map((o) => o.text).join(" · ")}`, "");
    out.push("Warnings and assumptions:", "", ...r.warnings.map((w) => `- ${w}`), "");
  }
  if (sides.some(({ s }) => s.cabin.gravity_g > 0 && s.cabin.gravity_g < 1)) out.push("## Partial gravity", "", `${PARTIAL_G_CAVEAT} Source: FM2, NTRS 20240015307 (${PARTIAL_G_SOURCE}), https://ntrs.nasa.gov/citations/20240015307, outside PSI.`, "");
  out.push("## Closest NASA evidence", "", ...rankEvidence(sides[sides.length - 1].s).slice(0, 5).map((e) => `- ${psiLink(e.accession)}: ${e.why}`), "");
  const srcs = new Map<string, string>();
  for (const { r } of sides) for (const p of r.provenance.sources) srcs.set(`${p.source_id}|${p.locator ?? ""}`, `- ${p.source_id}${p.locator ? ` · ${p.locator}` : ""}${p.note ? ` (${p.note})` : ""}`);
  out.push("## Sources", "", ...srcs.values(), "", "Sub-model status: " + Object.entries(ra.provenance.params).map(([k, v]) => `${k} ${v.calibrated ? "calibrated" : "theory-only"} (${v.source})`).join("; ") + ".", "");
  out.push("---", "Generated by EmberAtlas (NASA Space Apps 2026, Flame in Freefall). Data: NASA Physical Sciences Informatics (https://psi.nasa.gov).");
  return out.join("\n");
}

/** One-page brief for the next experiment, or null when the scenario is inside the tested envelope. */
export function nextTestBriefMarkdown(s: Scenario, r: SimResult): string | null {
  const nt = nextTest(s, r);
  if (!nt) return null;
  const item = s.items.find((i) => i.ignite) ?? s.items[0];
  const m = MATERIALS.find((x) => x.material_key === item?.material_key);
  const end = fireEnd(r);
  const peak = r.state.reduce((a, x) => Math.max(a, x.Q_W), 0);
  const pg = s.cabin.gravity_g > 0 && s.cabin.gravity_g < 1;
  const q = quenchLimit();
  const rng = (x: [number, number] | null, f: number, u: string) => (x ? `${s3(x[0] * f)}–${s3(x[1] * f)} ${u}` : "no tested range on record");
  return [
    `# Proposed experiment: ${nt.condition}`, "",
    `Prepared with EmberAtlas from "${s.name}". A proposal for discussion, not a NASA plan.`, "",
    "## Why this test", "", nt.why, "",
    "## Test conditions", "",
    "| Parameter | Proposed | Tested so far in PSI |", "|---|---|---|",
    `| Material | ${matName(item?.material_key)}, ${s3((item?.thickness_m ?? 0) * 1e3, "mm")} | ${m ? `${m.n_tests ?? "?"} tests in ${m.investigations.join(", ")}` : "—"} |`,
    `| O₂ (mole) | ${s3(s.cabin.x_o2 * 100)} % | ${rng(m?.o2_range ?? null, 100, "%")} |`,
    `| Pressure | ${s3(s.cabin.P_Pa / 1e3, "kPa")} | ${SOLID_ENVELOPE.P_Pa ? `${rng(SOLID_ENVELOPE.P_Pa, 1e-3, "kPa")} for PSI solid-fuel campaigns (${SOLID_ENVELOPE.sources.join(", ")})` : "no tested range on record"} |`,
    `| Air flow | ${s3(s.cabin.flow_m_s * 100, "cm/s")} | ${rng(m?.flow_range_m_s ?? null, 100, "cm/s")} |`,
    `| Gravity | ${s.cabin.gravity_g === 0 ? "µg" : s3(s.cabin.gravity_g, "g")} | µg (ISS/Cygnus) and 1 g only; no partial gravity in PSI |`, "",
    "## Where it could fly", "", `- ${nt.rig}`, ...(pg ? ["- Partial gravity cannot be set on the ISS: the µg and 1 g results bracket nothing (FM2, NTRS 20240015307, outside PSI)."] : []), "",
    "## Nearest NASA evidence", "", ...nt.investigations.map((acc) => `- ${psiLink(acc)}`), "",
    "## What EmberAtlas predicts (to be tested, not trusted)", "",
    `- ${end.t_s !== null ? `Fire out at ${s3(end.t_s, "s")}: ${end.phrase}` : `Fire ${end.phrase}`}.`,
    `- Peak heat release ${s3(peak, "W")}. These are extrapolations outside the tested envelope${pg ? `; ${PARTIAL_G_CAVEAT}` : "."}`, "",
    "## What the test would settle", "",
    `- Whether ${matName(item?.material_key)} ignites and spreads at ${s3(s.cabin.x_o2 * 100)} % O₂ and ${s3(s.cabin.P_Pa / 1e3, "kPa")}, and how fast (a new calibration point for the spread model).`,
    `- Whether the flame survives low air flow at this atmosphere (the engine's ${s3(q.cm_s, "cm/s")} quench limit, ${q.source}, is ${q.status === "TODO_VERIFY" ? "still TODO_VERIFY" : q.status}).`, "",
    "---", "Generated by EmberAtlas (NASA Space Apps 2026, Flame in Freefall). Data: NASA Physical Sciences Informatics (https://psi.nasa.gov).",
  ].join("\n");
}
