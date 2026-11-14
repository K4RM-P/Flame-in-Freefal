// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Plain-language methods: engine loop, sub-models + calibration source, validation, limitations, data, use of AI.
import fs from "node:fs";
import path from "node:path";
import { EQUATIONS } from "@/lib/equations";
import { SOURCES } from "@/lib/sources";
import { notes } from "./equation-notes";
import { Tex } from "@/components/Tex";
import catalogJson from "@/data/psi_catalog.json";
import summary from "@/data/validation/summary.json";

/* eslint-disable @typescript-eslint/no-explicit-any */
// Read at build time so a missing or not-yet-calibrated file shows as "Theory-only", never as an invented value.
function params(name: string): any {
  try { return JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", "params", `${name}.json`), "utf8")); } catch { return null; }
}

const MODELS = [
  { id: "spread", name: "Flame spread over each item", plain: "How fast the flame front moves across a material, from the oxygen level, pressure and the air flowing past it. Gravity enters only as an equivalent extra flow (buoyancy), so Moon and Mars values are bounded between microgravity and 1 g.", eqs: ["SP1", "SP2", "SP3", "SP4", "SP5", "GR1", "GR2", "BS2"], params: "spread" },
  { id: "habitat", name: "Cabin atmosphere (one well-mixed zone)", plain: "The burning area times the burning rate gives the heat released. That heat, the oxygen used and the CO₂ and CO made are mixed instantly through the whole cabin, with heat lost to the walls.", eqs: ["HA1", "HA2", "HA3", "HA4"], params: "habitat" },
  { id: "smoke", name: "Smoke ageing and transport to the detector", plain: "Smoke particles stick together as they age (coagulation) while the air carries them to the detector; the detector alarms when its threshold is crossed.", eqs: ["SM1", "SM2", "SM3", "SM4"], params: "smoke" },
  { id: "suppression", name: "Suppression by CO₂ or N₂", plain: "The released agent dilutes the cabin oxygen. A flame goes out when the calculated flame temperature falls below a critical value, or the oxygen falls below the inerting limit.", eqs: ["SU1", "SU2"], params: "suppression" },
] as const;

const MODEL_EVIDENCE: Record<string, string> = {
  spread: "The fitted spread temperature factor uses Saffire flight data. This is a model-level fit, with its tested cases listed below.",
  habitat: "The cabin balance uses literature properties. Saffire-III provides temperature and pressure for the replay comparison.",
  smoke: "SAME and SAME-R provide smoke and aerosol evidence. The current smoke model is theory-only.",
  suppression: "FLEX oxygen limits are used to fit critical temperatures for the listed liquid fuels. Solids use the 1 g cup-burner reference.",
};

const LOOP = [
  "Each burning item spreads its flame front with the spread model at the current cabin O₂, pressure and flow; gravity enters through the equivalent-flow mapping. Its burning area grows.",
  "Heat release = burning area × mass burning flux × heat of combustion (sourced material properties).",
  "The cabin temperature, pressure, O₂, CO₂ and CO advance with the well-mixed cabin equations.",
  "Smoke ages by coagulation and reaches the detector after a transport delay = distance ÷ flow speed; the detector alarms when its threshold is crossed.",
  "After the alarm (plus any set delay) the fan can switch off and the agent is released; the agent dilutes the O₂.",
  "An item goes out at burnout, when O₂ falls below the inerting limit, or when the flow is too weak to sustain it (quench).",
  "Every event (ignition, alarm, fan off, agent released, extinguished, a limit exceeded) is logged with its time.",
  "Steps are 0.5 s, up to 600 s. Monte Carlo (200 seeded runs) samples the property and parameter uncertainty for the p05–p95 bands and outcome probabilities.",
];

const KEY_PSI = ["PSI-25", "PSI-26", "PSI-98", "PSI-99", "PSI-100", "PSI-101", "PSI-69", "PSI-102"];
const ROLE: Record<string, string> = {
  "PSI-25": "spread rates, fan calibration (BASS-II)", "PSI-26": "spread (BASS)", "PSI-98": "spread, large-scale burns (SAFFIRE-I)",
  "PSI-99": "Earth test vs orbit (SAFFIRE-II)", "PSI-100": "cabin telemetry for the Saffire replay (SAFFIRE-III)",
  "PSI-101": "smoke ageing (SAME-R)", "PSI-102": "smoke (SAME)", "PSI-69": "droplet extinction and suppression (FLEX)",
};

export default function Methods() {
  const cat: Record<string, any> = (catalogJson as any).investigations;
  const invs = Object.values(cat) as any[];
  const targets = (summary as any).targets as any[];
  return (
    <div className="methods mx-auto max-w-7xl pb-16 text-[15px]">
      <header className="methods-hero">
        <p className="label">EmberAtlas science</p>
        <h1 className="display mt-3 text-4xl md:text-7xl">Methods &amp; validation</h1>
        <p className="measure mt-4 text-lg leading-relaxed text-mute">Follow a simulation from its equations to the NASA experiments and validation checks behind it.</p>
      </header>
      <div className="methods-layout">
      <nav aria-label="On this page" className="methods-nav">
        <p className="label">On this page</p>
        {[["loop", "How a run works"], ["models", "Sub-models"], ["validation", "Validation"], ["limitations", "Limitations"], ["data", "NASA data"], ["use-of-ai", "Use of AI"], ["references", "References"]].map(([id, l]) =>
          <a key={id} href={`#${id}`} className="methods-jump">{l}</a>)}
      </nav>

      <div className="methods-content">
      <section id="loop" className="card space-y-2">
        <h2 className="text-[20px] font-semibold">How a run works</h2>
        <p className="measure text-mute">You describe a cabin (or load a preset). The engine then repeats these steps every half second. The same inputs and seed always give the same result.</p>
        <ol className="methods-steps">{LOOP.map((s, i) => <li key={i}>{s}</li>)}</ol>
      </section>

      <section id="models" className="space-y-3">
        <h2 className="text-[20px] font-semibold">Sub-models and what calibrates them</h2>
        {MODELS.map((m) => {
          const p = params(m.params);
          const calibrated = m.id === "suppression" ? !!p?.fuels : p?.calibrated === true;
          return (
            <article key={m.id} className="card space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-[16px] font-semibold">{m.name}</h3>
                {calibrated ? <span className="chip border border-ok/40 text-ok">Calibrated</span>
                  : <span className="chip border border-dashed border-theory/60 text-theory">◌ Theory-only</span>}
              </div>
              <p className="measure text-mute">{m.plain}</p>
              <p className="measure text-sm text-mute"><strong>Data and calibration</strong> · {MODEL_EVIDENCE[m.id]}</p>
              <div className="methods-equations">
              {m.eqs.filter((e) => EQUATIONS[e]).map((e) => (
                <section key={e} className="methods-equation">
                  <p className="num text-xs text-mute">{e}</p>
                  <h4 className="mt-1 font-semibold">{EQUATIONS[e].text}</h4>
                  <div className="methods-math"><Tex tex={EQUATIONS[e].tex} block /></div>
                  <p>{notes[e][0]}</p>
                  <p className="text-sm text-mute">{notes[e][1]}</p>
                  <p className="text-sm"><strong>In the simulator</strong> · {notes[e][2]}</p>
                  {SOURCES[EQUATIONS[e].ref] && <a className="methods-source" href={`#source-${EQUATIONS[e].ref}`}>{SOURCES[EQUATIONS[e].ref].title}</a>}
                </section>
              ))}
              </div>
              <Calibration id={m.id} p={p} calibrated={calibrated} />
            </article>
          );
        })}
      </section>

      <section id="validation" className="card space-y-2">
        <h2 className="text-[20px] font-semibold">Validation</h2>
        <p className="measure text-mute">Each target compares a prediction with a held-out measurement or a published value. Failures are shown as failures.</p>
        <div className="overflow-x-auto">
          <table className="data">
            <thead><tr><th>id</th><th>model</th><th>quantity</th><th>measured / published</th><th>predicted</th><th>criterion</th><th>result</th></tr></thead>
            <tbody>{targets.map((t) => (
              <tr key={t.id}>
                <td className="num">{t.id}</td><td>{t.model}</td><td>{t.quantity}{t.note && <p className="text-[12px] text-faint">{t.note}</p>}</td>
                <td className="num">{Array.isArray(t.published) ? `(${t.published.join("–")})` : t.published == null ? "—" : typeof t.published === "object" ? JSON.stringify(t.published) : String(t.published)}</td>
                <td className="num">{t.predicted == null ? "∅" : typeof t.predicted === "number" ? Number(t.predicted.toPrecision(3)) : String(t.predicted)}</td>
                <td>{t.criterion}</td>
                <td><span className={`chip border ${t.status === "pass" ? "border-ok/40 text-ok" : t.status === "fail" ? "border-bad/50 text-bad" : "border-line text-mute"}`}>{t.status}</span></td>
              </tr>))}</tbody>
          </table>
        </div>
        <p className="text-[13px] text-mute">The Saffire replay reports RMSE and MAPE for simulated vs PSI-100 T and P telemetry when the replay is run. PSI-100 contains no O₂ telemetry, so O₂ replay error is No data. An unsourced detector threshold does not block a run; alarm and time-to-alarm show No data.</p>
      </section>

      <section id="limitations" className="card space-y-1" data-testid="limitations">
        <h2 className="text-[20px] font-semibold">Limitations</h2>
        <ul className="measure ml-5 list-disc space-y-1">
          <li><b>One well-mixed zone.</b> The cabin is a single zone with instant mixing, like a simplified form of NIST&apos;s CFAST zone model. Real cabins have hot layers, plumes and dead spots.</li>
          <li><b>1D flame spread per item.</b> Each item has one flame front moving along its length; there is no flame-to-item heat transfer.</li>
          <li><b>Partial gravity is a bounded estimate.</b> PSI holds microgravity and 1 g tests only. Moon and Mars values sit between those two bounds and are never measurements.</li>
          <li><b>Theory-only parts.</b> Every sub-model marked Theory-only above is uncalibrated physics; its numbers carry that label in the simulator too.</li>
          <li><b>Small n.</b> Many ISS results are single tests (SAFFIRE-II has one test per material and thickness). Earth-vs-orbit comparisons are like-for-like only and never a verdict on a ground test standard.</li>
          <li><b>Unsourced inputs are required.</b> Where no sourced value exists (for example a cabin volume or a detector threshold) the field stays empty until you enter it.</li>
          <li>Not for flight certification. AI text is generated from engine output and cited PSI data and can still be wrong.</li>
        </ul>
      </section>

      <section id="data" className="card space-y-2">
        <h2 className="text-[20px] font-semibold">NASA data</h2>
        <p className="measure text-mute">Every PSI row is cited by its accession (PSI-xx) plus file name and line. Data come from the public PSI API (GET only; no zips or video): <a className="underline underline-offset-2" href="https://psi.nasa.gov/physci/repo/search?q=combustion">PSI Data Repository: Combustion Science</a>.</p>
        <div className="overflow-x-auto"><table className="data">
          <thead><tr><th>accession</th><th>investigation</th><th>used for</th><th>DOI</th></tr></thead>
          <tbody>{KEY_PSI.map((acc) => {
            const e = invs.find((x) => x.accession === acc);
            return (
              <tr key={acc}><td className="num">{acc}</td><td>{e?.short_name ?? "—"}{e?.title && <span className="text-mute"> · {e.title}</span>}</td><td>{ROLE[acc]}</td>
                <td>{e?.doi ? <a className="num underline underline-offset-2" href={`https://doi.org/${e.doi}`}>Open DOI <span className="block text-xs">{e.doi}</span></a> : "—"}</td></tr>);
          })}</tbody>
        </table></div>
      </section>

      <section id="use-of-ai" className="card space-y-1">
        <h2 className="text-[20px] font-semibold">Use of AI</h2>
        <ul className="measure ml-5 list-disc space-y-1">
          <li>Claude Code (Anthropic) wrote the code, under human direction and review.</li>
          <li>The OpenAI API is used by the simulator to draft scenario fields for your review and interpret individual runs.</li>
          <li>The interpretation is grounded only on the engine output and the ranked PSI evidence; a numeric guard (lib/ai/guard.ts) rejects any number not present in them. Without an API key, the app says so instead of showing any text.</li>
          <li>Aster matches questions against the bundled NASA PSI catalog in local mode.</li>
          <li>No AI-generated images are used.</li>
        </ul>
      </section>

      <section id="references" className="card">
        <h2 className="text-[20px] font-semibold">References</h2>
        <ul className="methods-references">
          {Object.values(SOURCES).map((s) => (
            <li key={s.id} id={`source-${s.id}`}>
              {s.url ? <a className="methods-source" href={s.url}>{s.title} ↗</a> : <strong>{s.title}</strong>}
              <p className="num mt-1 text-xs text-mute">{s.id}{s.year ? ` · ${s.year}` : ""}</p>
            </li>
          ))}
          <li>NIST CFAST (Consolidated Fire and Smoke Transport) zone model, for the single-zone comparison.</li>
        </ul>
      </section>
      </div>
      </div>
    </div>
  );
}

function Calibration({ id, p, calibrated }: { id: string; p: any; calibrated: boolean }) {
  if (!p) return <p className="text-[13px] text-mute">∅ No parameter file: runs on theory only.</p>;
  if (id === "suppression") return (
    <p className="text-[13px] text-mute">Critical flame temperature fitted per fuel on FLEX ({p.source_id}; fitted on {(p.fitted_on ?? []).join(", ")}):{" "}
      {Object.entries(p.fuels ?? {}).map(([f, v]: [string, any]) => `${f} ${Math.round(v.T_crit_ug)} ± ${Math.round(v.T_crit_ug_sd)} K`).join("; ")}. Solids use the 1 g cup-burner reference.</p>
  );
  const parameters = Object.entries(p.params ?? {});
  return (
    <details className="methods-calibration">
      <summary className="cursor-pointer font-semibold">Calibration and held-out results</summary>
      <p className="my-3 text-mute">{calibrated ? "Fitted to the source records below." : p.note ?? "Theory only. Values come from published properties."}</p>
      {p.sources?.length > 0 && <ul className="mb-3 flex flex-wrap gap-2">{p.sources.map((item: string | { source_id?: string }) => {
        const ref = typeof item === "string" ? item : item.source_id ?? "unsourced";
        return <li key={ref}>{SOURCES[ref] ? <a className="methods-source" href={`#source-${ref}`}>{ref}</a> : ref}</li>;
      })}</ul>}
      {p.n_train != null && <p className="mb-3">{p.n_train} training rows · {p.n_test ?? "Unknown"} held-out rows</p>}
      <dl className="grid gap-2 sm:grid-cols-2">{parameters.map(([key, value]) => (
        <div key={key} className="flex justify-between gap-2 border-b border-line py-1"><dt className="num">{key}</dt><dd>{value == null ? "Not fitted" : String(value)}</dd></div>
      ))}</dl>
      {Object.entries(p.metrics ?? {}).map(([key, value]) => (
        Array.isArray(value) && value.length && value.every((row) => row && typeof row === "object")
          ? <div key={key} className="mt-4 overflow-x-auto">
              <p className="mb-1 font-medium capitalize">{key.replaceAll("_", " ")}</p>
              <table className="data">
                <thead><tr>{Object.keys(value[0]).map((column) => <th key={column} scope="col">{({ obs_mm_s: "Measured (mm/s)", pred_mm_s: "Predicted (mm/s)", rel_err: "Relative error" } as Record<string, string>)[column] ?? column.replaceAll("_", " ")}</th>)}</tr></thead>
                <tbody>{value.map((row, index) => <tr key={index}>{Object.keys(value[0]).map((column) => <td key={column}>{typeof row[column] === "number" ? Number(row[column].toPrecision(4)) : String(row[column] ?? "—")}</td>)}</tr>)}</tbody>
              </table>
            </div>
          : <p key={key} className="mt-2 capitalize">{key.replaceAll("_", " ")} · {typeof value === "number" ? Number(value.toPrecision(4)) : String(value ?? "—")}</p>
      ))}
    </details>
  );
}
