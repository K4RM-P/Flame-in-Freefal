// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Pure Markdown builder for the Evidence Brief export. Mirrors the Review screen sections a)–f); receipts become numbered footnotes.
import type { Answer, Review } from "./index";

export const LIMITATION_PG = "PSI contains microgravity and 1 g data only; partial-gravity values are bounded estimates.";

export function briefMarkdown(review: Review, meta: { date: string; version: string; shareUrl: string }): string {
  const { mission: m, verdict: v } = review;
  const matName = review.material?.display_name ?? "(material not in verified list)";
  const notes: string[] = [];
  const ref = (rid: string | null) => {
    if (!rid) return "";
    const r = review.receipts[rid];
    if (!r) return "";
    const rows = r.rows.map((t) => `${t.id} (${t.investigation_id}, ${t.locator})`).join("; ");
    notes.push(`${r.title}: ${r.value}. Rule: ${r.rule}${r.note ? ` Note: ${r.note}` : ""} Rows: ${rows || "none"}. Sources: ${r.sources.join(", ") || "none"}.`);
    return `[^${notes.length}]`;
  };
  const ans = (t: string, a: Answer) => [
    `### ${t}`, "",
    `**${a.big}**${ref(a.receipt)}${a.range ? ` ${a.range}` : ""}`, "",
    a.line, "",
    a.chips.length ? `Evidence: ${a.chips.join(", ")}` : "Evidence: none", "",
  ];
  const pct = (x: number | null | undefined) => (x == null ? "—" : `${+(x * 100).toPrecision(3)}%`);

  const L: string[] = [
    "# EmberAtlas — Fire Safety Evidence Brief", "",
    `- Cabin: ${m.name} — ${pct(m.x_o2)} O₂ · ${+m.P_kPa.toPrecision(3)} kPa · ${m.gravity_g} g · flow ${m.flow_cm_s} cm/s`,
    `- Material: ${matName} (\`${review.material?.material_key ?? "—"}\`)`,
    `- Date: ${meta.date} · EmberAtlas v${meta.version}`,
    `- Share link: ${meta.shareUrl}`, "",
    "## Verdict", "",
    `**${v.label}** — ${v.sentence}${ref(review.q1.receipt)}`, "",
    "## Answers", "",
    ...ans("Q1 Will it burn here?", review.q1),
    ...ans("Q2 If it burns, how bad?", review.q2),
    ...ans("Q3 Can we catch it and stop it?", review.q3),
    "## Earth test vs orbit", "",
  ];
  const evo = review.earthVsOrbit;
  if (evo.state === "pending") L.push("Data pending.", "");
  else if (evo.state === "none") L.push("No like-for-like orbit comparison yet → see Next test.", "");
  else {
    L.push("| 1 g outcome | µg outcome | Conditions | Agreement | n | Source |", "|---|---|---|---|---|---|");
    for (const r of evo.rows) L.push(`| ${r.one_g.outcome ?? "—"} | ${r.ug.outcome ?? "—"} | ${r.thickness_mm ?? "—"} mm, µg ${pct(r.ug.x_o2)} O₂, ${r.ug.flow_cm_s ?? "—"} cm/s | ${r.agreement} | ${r.n} | ${r.source_id} (${r.locator}) |`);
    L.push("");
  }
  L.push(`> ${evo.caveat}`, "", "## What to do", "");
  if (!review.actions.length) L.push("Data pending.");
  for (const a of review.actions) L.push(`- **${a.kind}**: ${a.text}${a.chips.length ? ` (${a.chips.join(", ")})` : ""}`);
  L.push("", "## Next test to fly", "", `- Condition: ${review.nextTest.condition}`, `- Why: ${review.nextTest.why}`, `- Rig: ${review.nextTest.rig}`, "", "## Evidence used", "");
  if (!review.evidence.length) L.push("Data pending.");
  for (const e of review.evidence) L.push(`- **${e.accession}** ${e.title} — ${e.why}${e.doi ? ` DOI: ${e.doi}` : ""}${e.url ? ` <${e.url}>` : ""}`);
  L.push("", "## Limitations", "", `> ${LIMITATION_PG}`, ...v.reasons.map((r) => `> - ${r}`), "");
  if (notes.length) L.push("---", "", ...notes.map((n, i) => `[^${i + 1}]: ${n}`), "");
  return L.join("\n");
}
