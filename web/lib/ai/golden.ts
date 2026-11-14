// The 12 golden questions (PRD §11): required tool calls + an offline, template-based composer used for the
// demo cache when no API key is available. Offline answers use ONLY numbers from the tool outputs below.
import { runTool } from "./tools";
import type { AgentAnswer, TraceItem } from "./agent";
import { guard } from "./guard";

/* eslint-disable @typescript-eslint/no-explicit-any */
const LUNAR = { x_o2: 0.34, P_kPa: 56.5, flow_cm_s: 5, gravity_g: 0.165 };
const f = (x: number, d = 3) => Number(x.toPrecision(d)).toString();
const pct = (x: number, d = 3) => f(x * 100, d);
const band = (r: any, d = 3) => `p05–p95 ${f(r.uncertainty.p05, d)}–${f(r.uncertainty.p95, d)}`;

export interface Golden { id: number; q: string; calls: [string, unknown][]; compose: (o: any[]) => string; requires: string[]; cites: string[] }

export const GOLDEN: Golden[] = [
  { id: 1, q: "For a 34%/8.2 psia lunar habitat, which PSI investigations matter most and why?",
    calls: [["rank_investigations", { mission: LUNAR }]], requires: ["rank_investigations"], cites: ["S:"],
    compose: ([r]) => `Ranking for 34% O₂ at 56.5 kPa (8.2 psia), 5 cm/s: ${r.slice(0, 4).map((x: any, i: number) => `${i + 1}. ${x.id} (score ${f(x.score, 2)}; ${x.why.fuel}; ${x.why.data})`).join(" ")} No PSI investigation tested 34%/56.5 kPa directly, so atmosphere match is partial for all [S:psi]. FLEX ranks high because it is the only investigation with verified test points in EmberAtlas so far [S:ntrs-20150023456]; solid-fuel campaigns (BASS-II, Saffire) score on fuel realism and scale [S:bass2-sci-rep-2017] [S:ntrs-20180005168]. See /evidence.` },
  { id: 2, q: "Can PMMA burn at lower O₂ in microgravity than in a 1 g test? Show the evidence and the model.",
    calls: [["get_investigation", { id: "BASS-II" }], ["run_boundary", { x_o2: 0.17, P_kPa: 101.3, flow_cm_s: 5 }], ["coverage_gaps", {}]], requires: ["get_investigation"], cites: ["S:bass2-sci-rep-2017"],
    compose: ([iv]) => `BASS-II reports a lower limiting O₂ for PMMA rods in microgravity than in normal gravity: ${iv.key_findings[0].text} [S:bass2-sci-rep-2017]. The mechanism is flow: at low imposed flow, µg flames avoid the strong buoyant convection that blows off or cools 1 g flames. EmberAtlas cannot yet show a model boundary for this — the flammability-boundary model [M:boundary] is not built because BASS-II burn/extinct points still need digitization — so this is evidence, not a model output. Conflicting evidence: quiescent µg flames are weaker (BRE) [S:dehghani-bre]. See /gaps.` },
  { id: 3, q: "Estimate the opposed-flow spread rate over 0.37 mm SIBAL fabric at 34% O₂, 8.2 psia, 10 cm/s, in lunar gravity, with uncertainty.",
    calls: [["run_spread", { material: "sibal", x_o2: 0.34, P_kPa: 56.5, flow_cm_s: 10, gravity_g: 0.165 }]], requires: ["run_spread"], cites: ["M:spread"],
    compose: ([r]) => `[M:spread] gives ${f(r.value)} mm/s (${band(r)}) for SIBAL at 34% O₂ (pO₂ ${f(r.inputs.p_o2_kPa)} kPa), 56.5 kPa, 10 cm/s forced flow. Lunar buoyancy adds u_b ≈ ${f(r.extra.u_b_cm_s)} cm/s, so the equivalent flow is ${f(r.extra.V_eq_cm_s)} cm/s; the band [µg, g-equivalent] is ${f(r.extra.band_mm_s[0])}–${f(r.extra.band_mm_s[1])} mm/s — a bounded estimate, not a measurement [S:olson-1991]. Thin-fuel de Ris spread does not depend on flow, so the two ends coincide. This is uncalibrated — theory only (BASS-II/Saffire data pending) [S:de-ris-1969]. See /methods#model-spread.` },
  { id: 4, q: "How much CO₂ (mole fraction) would be needed to inert a heptane fire at 21%/14.7 psia vs 34%/8.2 psia? Compare 1 g and µg calibrations.",
    calls: [["run_suppression", { fuel: "n-heptane", x_o2: 0.21, P_kPa: 101.3, agent: "CO2" }], ["run_suppression", { fuel: "n-heptane", x_o2: 0.34, P_kPa: 56.5, agent: "CO2" }]], requires: ["run_suppression"], cites: ["M:suppression"],
    compose: ([a, b]) => `[M:suppression], CO₂ dispersed into the cabin atmosphere: at 21% O₂ / 101.3 kPa the µg-calibrated answer is ${f(a.extra.x_agent_ug)} mole fraction (${band(a)}) vs ${f(a.extra.x_agent_1g)} with the 1 g reference. At 34% O₂ / 56.5 kPa it is ${f(b.extra.x_agent_ug)} (${band(b)}) vs ${f(b.extra.x_agent_1g)} (1 g). µg T_crit is ${f(a.extra.T_crit_ug_K, 4)} K (fitted to FLEX O₂/N₂ LOIs) and the 1 g reference ${f(a.extra.T_crit_1g_K, 4)} K [S:dietrich-2014] [S:nfpa-2001]. The 56.5 kPa case is outside validated range (FLEX LOIs are at 1 atm). See /methods#model-suppression.` },
  { id: 5, q: "What is heptane's droplet LOI, and how does CO₂ dilution change it?",
    calls: [["get_validation", {}]], requires: ["get_validation"], cites: ["S:dietrich-2014"],
    compose: ([v]) => { const t = (id: string) => v.targets.find((x: any) => x.id === id);
      return `FLEX measured a heptane LOI of about ${t("V1").published} in O₂/N₂ at 1 atm, rising to about ${t("V3").published} when CO₂ is dispersed into air [S:dietrich-2014]. EmberAtlas' droplet dual-extinction model predicts ${t("V1").predicted} and ${t("V3").predicted} (fail, reported) [M:droplet], while pure thermal theory with a µg T_crit fitted on the O₂/N₂ LOI predicts ${t("V3-thermal").predicted} for CO₂ (pass) [M:suppression]. So CO₂ raises the limiting O₂ mainly through its heat capacity. See /validation.`; } },
  { id: 6, q: "Do flames survive without ventilation at 34% O₂? (BRE + boundary model)",
    calls: [["get_investigation", { id: "ACME-BRE" }], ["run_boundary", { x_o2: 0.34, P_kPa: 101.3, flow_cm_s: 0 }]], requires: ["get_investigation"], cites: ["S:dehghani-bre"],
    compose: ([iv]) => `ACME BRE evidence: ${iv.key_findings[0].text} [S:dehghani-bre]. So at 34% O₂ quiescent flames were observed to persist in that burner configuration, while at 21% they extinguished. The boundary model [M:boundary] is not available yet (no digitized solid burn/extinct data), so EmberAtlas gives no probability here. See /gaps.` },
  { id: 7, q: "A 5 kW fire burns 3 minutes in a 20 m³ rover: what happens to cabin T, P, O₂ and CO₂?",
    calls: [["run_habitat", { material: "cotton", x_o2: 0.34, P_kPa: 56.5, V_m3: 20, Q_kW: 5, t_burn_s: 180 }]], requires: ["run_habitat"], cites: ["M:habitat"],
    compose: ([r]) => `[M:habitat] for a 5 kW cotton fire, 180 s, 20 m³ at 34% O₂ / 56.5 kPa: at the end of the burn the cabin is ${f(r.at_end_of_burn.T_C)} °C and ${f(r.at_end_of_burn.P_kPa)} kPa; O₂ falls to ${pct(r.at_end_of_burn.x_o2)}% and CO₂ rises to ${pct(r.at_end_of_burn.x_co2)}%, CO ${f(r.at_end_of_burn.co_ppm)} ppm. Peak temperature rise ${f(r.value)} K (${band(r)}). O₂ consumption uses 13.1 MJ/kg O₂ [S:huggett-1980]; limits from JSC 20584 [S:jsc-20584-revC]. Uncalibrated — theory only (wall heat loss not yet fitted to Saffire). See /methods#model-habitat.` },
  { id: 8, q: "What smoke particle sizes reach a detector 2 minutes from the source, and which detector type suits them?",
    calls: [["run_smoke", { transport_s: 120 }]], requires: ["run_smoke"], cites: ["M:smoke"],
    compose: ([r]) => `[M:smoke] after 120 s of coagulation: volume-mean ${f(r.value)} nm, d10 ${f(r.extra.d10_nm)} nm, d43 ${f(r.extra.d43_nm)} nm at the default initial size and concentration; favoured principle: ${r.extra.favoured_detector}. This is uncalibrated — theory only; SAME/SAME-R measured averages mostly in the 200–400 nm range [S:same-r], so a real detector must cover that range. See /methods#model-smoke.` },
  { id: 9, q: "Is there lunar-gravity data in PSI? (Answer: no; explain the bounding method.)",
    calls: [["coverage_gaps", {}], ["gravity_map", { x_o2: 0.34, P_kPa: 56.5, flow_cm_s: 5, gravity_g: 0.165 }]], requires: ["coverage_gaps", "gravity_map"], cites: ["M:gravity"],
    compose: ([c, g]) => `No. PSI combustion data are microgravity or 1 g; EmberAtlas holds ${c.partial_gravity_points} partial-gravity points [S:psi]. We bound lunar behaviour with an equivalent flow: u_b = (g α ΔT/T)^(1/3) gives ${f(g.extra.u_b_cm_s)} cm/s at lunar g for 34% O₂ / 56.5 kPa, so a 5 cm/s fan flow maps to ${f(g.value)} cm/s [M:gravity] [S:olson-1991]. The result is a band between µg and that equivalent flow — a bounded estimate, never a measurement. LUCI and FM2 are external cross-checks (outside PSI) [S:ntrs-20240015307]. See /console.` },
  { id: 10, q: "Is helium or CO₂ the better suppressant in microgravity?",
    calls: [["get_validation", {}], ["run_suppression", { fuel: "n-heptane", x_o2: 0.21, P_kPa: 101.3, agent: "CO2" }], ["run_suppression", { fuel: "n-heptane", x_o2: 0.21, P_kPa: 101.3, agent: "HE" }]], requires: ["get_validation", "run_suppression"], cites: ["S:dietrich-2014"],
    compose: ([v, c, h]) => { const t = (id: string) => v.targets.find((x: any) => x.id === id);
      return `The evidence conflicts. FLEX droplets: CO₂ raised heptane's LOI to about ${t("V3").published} while helium gave about ${t("V4b-n-heptane").published} [S:dietrich-2014]. Pure thermal theory [M:suppression] needs ${f(c.extra.x_agent_ug)} mole fraction CO₂ vs ${f(h.extra.x_agent_ug)} He to inert heptane in air, ranking CO₂ more effective per mole — but it under-predicts FLEX He LOIs (predicted ${t("V4b-n-heptane-thermal").predicted}, fail), pointing to helium's diffusivity. A drop-tower study found helium most effective (outside PSI) [S:drop-tower-suppressant]. Treat it as configuration-dependent. See /gaps.`; } },
  { id: 11, q: "Where is the evidence thinnest for lunar habitats, and what 5 tests would most reduce uncertainty?",
    calls: [["coverage_gaps", {}], ["propose_experiments", { mission: LUNAR, n: 5 }]], requires: ["propose_experiments"], cites: ["S:"],
    compose: ([c, p]) => `Thinnest evidence: no partial-gravity data (${c.partial_gravity_points} points) and no verified solid-fuel data at 34% O₂ / 56.5 kPa; verified points are FLEX droplets only [S:ntrs-20150023456]. Proposed tests (${p.method}): ${p.proposals.map((q: any) => `${q.rank}. ${q.material} at ${pct(q.x_o2)}% O₂, ${q.P_kPa} kPa, ${q.flow_cm_s} cm/s`).join("; ")}. Target rig: SoFIE (rig limits to verify) [S:psi]. See /gaps.` },
  { id: 12, q: "Compare BASS-II and Saffire on SIBAL fabric: what changes with scale?",
    calls: [["get_investigation", { id: "BASS-II" }], ["get_investigation", { id: "Saffire-I-III" }]], requires: ["get_investigation"], cites: ["S:ntrs-20180005168"],
    compose: ([a, b]) => `BASS-II burned small samples in a glovebox duct at ${a.flow_range_cm_s[0]}–${a.flow_range_cm_s[1]} cm/s and reduced O₂ [S:bass2-sci-rep-2017]; Saffire burned a large SIBAL sheet in a Cygnus vehicle at ${b.flow_range_cm_s[0]}–${b.flow_range_cm_s[1]} cm/s in air [S:ntrs-20180005168]. Scale changes flame length, radiation and heat feedback, so small-sample spread rates need not transfer to large fires. Quantitative comparison awaits digitized SIBAL spread rates from both (listed in HUMAN_TASKS). See /evidence.` },
];

export function offlineAnswer(g: Golden): AgentAnswer {
  const trace: TraceItem[] = g.calls.map(([name, input]) => ({ name, input, output: runTool(name, input) }));
  const answer = g.compose(trace.map((t) => t.output));
  const gr = guard(answer, trace.map((t) => t.output), g.q);
  return { question: g.q, answer, trace, mode: "offline-demo", guard: { ok: gr.ok, unsupported: gr.unsupported, regenerated: false } };
}

export const normalizeQ = (q: string) => q.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
export function matchGolden(q: string): Golden | undefined {
  const n = normalizeQ(q);
  return GOLDEN.find((g) => normalizeQ(g.q) === n) ?? GOLDEN.find((g) => { const a = new Set(normalizeQ(g.q).split(" ")); const b = n.split(" "); return b.filter((w) => a.has(w)).length / Math.max(a.size, b.length) > 0.75; });
}
