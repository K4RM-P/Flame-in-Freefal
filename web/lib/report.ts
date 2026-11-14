// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
import { EQUATIONS } from "./equations";
import { source } from "./sources";
import type { ModelResult } from "./physics/models";

const n = (x: unknown) => (typeof x === "number" ? (Number.isFinite(x) ? Number(x.toPrecision(5)).toString() : "—") : String(x));

/** Engineering report (Markdown) with equations, inputs, UQ, validity and sources. */
export function reportMarkdown(r: ModelResult, title: string): string {
  const L: string[] = [`# EmberAtlas engineering report — ${title}`, "", `Generated ${new Date().toISOString()} · model \`${r.model_id}\``, "",
    "> PSI contains microgravity and 1 g data only; partial-gravity values are bounded estimates.", "",
    "## Result", "", `**${n(r.value)} ${r.units}** (p05 ${n(r.uncertainty.p05)}, p50 ${n(r.uncertainty.p50)}, p95 ${n(r.uncertainty.p95)})`, "",
    `Validity: calibrated=${r.validity.calibrated}, in_envelope=${r.validity.in_envelope}, nearest-data distance=${n(r.validity.nearest_data_distance)}${r.validity.note ? ` — ${r.validity.note}` : ""}`, "",
    "## Inputs", "", "| input | value |", "|---|---|", ...Object.entries(r.inputs).map(([k, val]) => `| ${k} | ${n(val)} |`), "",
    "## Equations", "", ...r.equation_ids.filter((id) => EQUATIONS[id]).map((id) => `- **${id}** ${EQUATIONS[id].text}: $${EQUATIONS[id].tex}$ [S:${EQUATIONS[id].ref}]`), "",
    "## Assumptions", "", ...r.assumptions.map((a) => `- ${a}`), "",
    "## Additional outputs", "", ...Object.entries(r.extra).filter(([, val]) => typeof val !== "object" || val === null).map(([k, val]) => `- ${k}: ${n(val)}`), "",
    "## Sources", "", ...r.sources.map((s) => `- [S:${s}] ${source(s).title}${source(s).url ? ` — ${source(s).url}` : ""}`), ""];
  return L.join("\n");
}

export function download(name: string, text: string, type = "text/markdown") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}
