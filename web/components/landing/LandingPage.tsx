// SI-assisted: written with Codex (OpenAI); see README "Use of AI (SI)".
import Link from "next/link";
import catalogJson from "@/data/psi_catalog.json";
import spread from "@/data/params/spread.json";
import habitat from "@/data/params/habitat.json";
import smoke from "@/data/params/smoke.json";
import telemetry from "@/data/psi/saffire_telemetry.json";
import { EQUATIONS } from "@/lib/equations";
import { Tex } from "@/components/Tex";
import { AsterGuideButton } from "@/components/AsterGuideButton";

type Accession = {
  accession: string;
  accession_id: number;
  short_name: string;
  doi?: string | null;
};

const catalog = catalogJson as unknown as { investigations: Record<string, Accession> };
const accessionRoles: Record<string, string> = {
  "PSI-25": "BASS-II · flame spread and fan calibration",
  "PSI-26": "BASS · solid-fuel burning and suppression",
  "PSI-69": "FLEX · droplet extinction and suppression evidence",
  "PSI-98": "Saffire-I · large-scale material flame spread",
  "PSI-99": "Saffire-II · Earth/orbit comparison rows",
  "PSI-100": "Saffire-III · replay table and cabin telemetry",
  "PSI-101": "SAME-R · smoke aerosol measurements",
  "PSI-102": "SAME · smoke and aerosol measurements",
};

const accessions = Object.values(catalog.investigations)
  .filter((record) => Object.hasOwn(accessionRoles, record.accession))
  .sort((a, b) => Number(a.accession.slice(4)) - Number(b.accession.slice(4)));

// Homepage card previews use real records: one catalog study and one equation the engine uses.
const PREVIEW_STUDY = "PSI-100", PREVIEW_EQ = "SP1";
const previewStudy = (Object.values(catalog.investigations) as (Accession & { title?: string; objective?: string })[]).find((r) => r.accession === PREVIEW_STUDY);
const studyObjective = (() => { const t = (previewStudy?.objective ?? "").replace(/\s+/g, " ").trim(); return t.length > 150 ? `${t.slice(0, 150).replace(/\s\S*$/, "")}…` : t; })();
const previewEq = EQUATIONS[PREVIEW_EQ];

/** Static illustration of the simulator's cabin view (not a run result): perspective module, sample, flame, detector, flow. */
function CabinPreview() {
  const L = "rgb(var(--line))", F = "rgb(var(--faint))";
  return (
    <span className="landing-index__preview landing-cabin">
      <svg viewBox="0 0 360 150" aria-hidden="true" focusable="false">
        <rect x="4" y="4" width="352" height="142" fill="rgb(var(--panel))" stroke={L} />
        <rect x="110" y="44" width="140" height="62" fill="rgb(var(--bg))" stroke={L} />
        {[[4, 4, 110, 44], [356, 4, 250, 44], [4, 146, 110, 106], [356, 146, 250, 106]].map(([a, b, c, d]) => <line key={`${a}${b}`} x1={a} y1={b} x2={c} y2={d} stroke={L} />)}
        {[136, 162, 188, 214].map((x) => <line key={x} x1={x} y1={48} x2={x} y2={102} stroke={L} />)}
        {[0, 1, 2, 3, 4].map((i) => <line key={i} x1={300 - i * 52} x2={282 - i * 52} y1={36} y2={36} stroke="rgb(var(--blue))" strokeOpacity={0.7} />)}
        <rect x="150" y="96" width="120" height="8" fill="rgb(var(--surface2))" stroke={F} />
        <path d="M206 96 C196 82 204 70 210 60 C214 72 224 78 214 96 Z" fill="rgb(var(--accent))" fillOpacity={0.85} />
        <rect x="58" y="26" width="18" height="10" rx="2" fill="none" stroke={F} />
        <line x1="67" y1="4" x2="67" y2="26" stroke={F} />
        <circle cx="67" cy="31" r="44" fill="none" stroke={F} strokeDasharray="3 4" />
      </svg>
      <span className="landing-cabin__note">Illustration of the cabin view · not a run result</span>
    </span>
  );
}

const NASA_IMAGE = "https://science.nasa.gov/wp-content/uploads/2024/01/jsc2023e002281orig.jpg?format=jpeg&w=1280";
const NASA_IMAGE_SOURCE = "https://science.nasa.gov/biological-physical/stories/how-and-why-do-nasa-researchers-simulate-microgravity-on-earth/";
const REPOSITORY = "https://github.com/K4RM-P/Flame-in-Freefal";
const PSI_SEARCH = "https://psi.nasa.gov/physci/repo/search?q=combustion";

export function LandingPage() {
  const spreadScope = spread as unknown as {
    calibrated: boolean;
    split: { train_ids: string[]; test_ids: string[] };
    applies_to: string;
    note: string;
  };
  const trainingCount = spreadScope.split.train_ids.length;
  const heldOutCount = spreadScope.split.test_ids.length;
  const modelStates = [
    { key: "spread", name: "Flame spread", label: spreadScope.calibrated ? "Calibrated · bounded scope" : "Theory-only", theory: !spreadScope.calibrated, detail: `Scope: ${spreadScope.applies_to}. ${trainingCount} training flight ${trainingCount === 1 ? "sample" : "samples"}; ${heldOutCount} held-out flight ${heldOutCount === 1 ? "sample" : "samples"}.` },
    { key: "habitat", name: "Cabin heat loss", label: habitat.calibrated ? "Calibrated" : "Theory-only", theory: !habitat.calibrated, detail: "The cabin is represented as one well-mixed zone; this is not a spatial fire or smoke model." },
    { key: "smoke", name: "Smoke aging", label: smoke.calibrated ? "Calibrated" : "Theory-only", theory: !smoke.calibrated, detail: "Detector timing needs a sourced threshold. Without one, alarm time stays no-data." },
  ];
  const telemetryLines = telemetry.rows.map((row) => row.line);

  return (
    <div className="landing">
      <div className="landing__wrap">
        <section className="landing-hero" aria-labelledby="landing-title">
          <div className="landing-hero__copy">
            <div className="landing-hero__top"><p className="landing-kicker"><span className="landing-kicker__mark" aria-hidden="true" /> NASA Space Apps · Flame in Freefall</p><AsterGuideButton page="overview" /></div>
            <h1 id="landing-title">Fire behaves differently in space. <em>Test what follows.</em></h1>
            <p className="landing-hero__lede">EmberAtlas brings NASA’s in-space combustion evidence into a spacecraft fire scenario you can inspect, replay, and question.</p>
            <div className="landing-actions">
              <Link className="landing-button landing-button--primary" href="/simulator">Start a simulation <span aria-hidden="true">↗</span></Link>
              <Link className="landing-button landing-button--quiet" href="/methods#data">Explore the evidence</Link>
            </div>
            <p className="landing-hero__receipt"><span aria-hidden="true">↳</span> Every cited result can be traced to a NASA PSI accession, source file, and row.</p>
          </div>
          <figure className="landing-hero__figure">
            <div className="landing-hero__image-frame">
              {/* NASA's original image URL is kept intact for attribution and provenance. */}
              <img src={NASA_IMAGE} alt="A nearly spherical flame surrounds an acrylic sample inside the International Space Station's Combustion Integrated Rack." fetchPriority="high" />
              <span className="landing-hero__image-index">FLAME / 01</span>
            </div>
            <figcaption><span>SoFIE-GEL · Combustion Integrated Rack, ISS</span><a href={NASA_IMAGE_SOURCE} target="_blank" rel="noreferrer">Image: NASA / JSC ↗</a></figcaption>
          </figure>
        </section>

        <nav className="landing-index" aria-label="Explore EmberAtlas">
          <Link className="landing-index__tile landing-index__tile--primary" href="/simulator">
            <span className="landing-index__arrow" aria-hidden="true">↗</span>
            <CabinPreview />
            <span className="landing-index__eyebrow">01 / SIMULATOR · RUN A SCENARIO</span>
            <span className="landing-index__title">Simulation Bay</span><span className="landing-index__desc">Set a cabin and a material, run it, and play back flame spread, smoke, detection and suppression in the cabin view.</span>
          </Link>
          <Link className="landing-index__tile" href="/match">
            <span className="landing-index__arrow" aria-hidden="true">↗</span>
            {previewStudy && <span className="landing-index__preview landing-study" aria-label={`Example catalog record: ${previewStudy.accession} ${previewStudy.short_name}`}>
              <span className="landing-study__id">{previewStudy.accession} · {previewStudy.short_name}</span>
              <span className="landing-study__title">{previewStudy.title}</span>
              <span className="landing-study__objective">{studyObjective}</span>
            </span>}
            <span className="landing-index__eyebrow">02 / EXPERIMENT MATCH</span>
            <span className="landing-index__title">Find the NASA tests behind a design</span><span className="landing-index__desc">Rank PSI studies by how close their conditions are to yours.</span>
          </Link>
          <Link className="landing-index__tile" href="/methods">
            <span className="landing-index__arrow" aria-hidden="true">↗</span>
            {previewEq && <span className="landing-index__preview landing-formula">
              <span className="landing-study__id">{PREVIEW_EQ} · {previewEq.text}</span>
              <Tex tex={previewEq.tex} block />
            </span>}
            <span className="landing-index__eyebrow">03 / METHODS &amp; VALIDATION</span>
            <span className="landing-index__title">Every formula, with its evidence</span><span className="landing-index__desc">What each equation calculates, where the simulator uses it, and the held-out checks.</span>
          </Link>
        </nav>

        <section className="landing-section landing-problem" id="problem" aria-labelledby="problem-title">
          <div className="landing-section__head">
            <p className="landing-kicker">WHY THIS IS DIFFERENT</p>
            <h2 id="problem-title">A flame has no “up” to follow.</h2>
          </div>
          <div className="landing-problem__body">
            <p>On Earth, buoyancy pulls hot gases upward and shapes how a fire grows. In microgravity, that familiar motion weakens. Flame spread, smoke transport, and detector timing depend on the cabin’s oxygen, pressure, ventilation, and fuel in ways a ground test cannot fully reproduce.</p>
            <p>Future exploration cabins may also use atmospheres that differ from sea-level air. EmberAtlas makes those inputs explicit and compares scenarios with the in-space experiments that can inform them—while marking where the evidence ends.</p>
            <Link className="landing-text-link" href="/methods#limitations">Read the model limitations <span aria-hidden="true">→</span></Link>
          </div>
        </section>

        <section className="landing-section" id="workflow" aria-labelledby="workflow-title">
          <div className="landing-section__head landing-section__head--row">
            <div><p className="landing-kicker">FROM QUESTION TO NEXT TEST</p><h2 id="workflow-title">A clear path through the evidence.</h2></div>
            <p className="landing-section__intro">The scenario builder never starts a run for you. Review every drafted field, fill any missing input, then choose when to simulate.</p>
          </div>
          <ol className="landing-steps">
            <li><span className="landing-step__number">01</span><h3>Set the cabin</h3><p>Choose an environment and material. Enter variables manually or ask the AI to draft fields from a sourced scenario description.</p></li>
            <li><span className="landing-step__number">02</span><h3>Run the model</h3><p>Follow flame spread, cabin atmosphere, smoke transport, detection, and suppression through the simulation timeline.</p></li>
            <li><span className="landing-step__number">03</span><h3>Inspect the receipt</h3><p>Open a result’s source details, uncertainty band, assumptions, and validity state. Theory-only and no-data states remain visible.</p></li>
            <li><span className="landing-step__number">04</span><h3>Choose the next test</h3><p>Use missing inputs and evidence gaps to see what measurement would make a future run more informative.</p></li>
          </ol>
        </section>

        <section className="landing-section landing-evidence" id="evidence" aria-labelledby="evidence-title">
          <div className="landing-section__head landing-section__head--row">
            <div><p className="landing-kicker">NASA PSI · COMBUSTION SCIENCE</p><h2 id="evidence-title">The experiment stays attached to the result.</h2></div>
            <p className="landing-section__intro">The app’s currently featured accessions are drawn from its PSI catalog and source records. Open a DOI to inspect the original investigation.</p>
          </div>
          <div className="landing-accessions">
            {accessions.map((record) => (
              <article className="landing-accession" key={record.accession}>
                <span className="landing-accession__id">{record.accession}</span>
                <div><h3>{record.short_name}</h3><p>{accessionRoles[record.accession]}</p></div>
                <a aria-label={`Open ${record.accession} NASA PSI record`} href={record.doi ? `https://doi.org/${record.doi}` : `https://psi.nasa.gov/physci/repo/data/investigations/${record.accession_id}`} target="_blank" rel="noreferrer">↗</a>
              </article>
            ))}
          </div>
          <div className="landing-replay">
            <div className="landing-replay__tag">REPLAY / PSI-100</div>
            <div><h3>Saffire-III: replay the cabin record</h3><p>The replay uses PSI-100 temperature and pressure telemetry. The source file is <code>{telemetry.file}</code>; the app records channel rows such as {telemetryLines.length > 1 ? `${telemetryLines[0]}–${telemetryLines[telemetryLines.length - 1]}` : telemetryLines[0]}. PSI-100 has no O₂ telemetry, so oxygen replay error is <strong>no data</strong>.</p></div>
            <a className="landing-text-link" href="https://doi.org/10.60555/040q-4h36" target="_blank" rel="noreferrer">Open PSI-100 record ↗</a>
          </div>
          <p className="landing-source-note">NASA PSI records · <a href={PSI_SEARCH} target="_blank" rel="noreferrer">Combustion Science collection ↗</a>. Source locators are available in the simulator’s result receipts and Methods page.</p>
        </section>

        <section className="landing-section landing-science" id="science" aria-labelledby="science-title">
          <div className="landing-section__head">
            <p className="landing-kicker">SIMULATION / SCIENCE</p>
            <h2 id="science-title">A model is useful when you can see its boundaries.</h2>
          </div>
          <div className="landing-science__grid">
            <div className="landing-science__explain">
              <p>The engine advances a cabin scenario in half-second steps. It models flame spread, a one-zone cabin atmosphere, smoke aging and transport, detector response, and suppression. Seeded Monte Carlo runs produce uncertainty bands; a Saffire replay can compare simulated temperature and pressure with the PSI-100 telemetry.</p>
              <p>Those pieces do not share one validation status. Spread calibration is narrowly scoped to opposed-flow SIBAL fabric under near-microgravity conditions, with one flight sample used for fitting and one held out. The cabin heat-loss and smoke models are theory-only. Their values are labeled accordingly.</p>
              <Link className="landing-text-link" href="/methods#models">See equations and calibration scope <span aria-hidden="true">→</span></Link>
            </div>
            <div className="landing-schematic" role="img" aria-label="Conceptual cabin layout showing ventilation passing a fuel sample and carrying smoke toward a detector; this is not a simulation result.">
              <div className="landing-schematic__top"><span>SCENARIO LOGIC</span><span>CONCEPTUAL · NOT A RUN RESULT</span></div>
              <svg viewBox="0 0 600 250" aria-hidden="true" focusable="false">
                <rect x="25" y="30" width="550" height="190" rx="4" className="schematic-cabin" />
                <path d="M63 80h71m0 0-12-8m12 8-12 8M63 122h71m0 0-12-8m12 8-12 8M63 164h71m0 0-12-8m12 8-12 8" className="schematic-flow" />
                <path d="M247 168c-13-20 10-27 2-47-2-6-2-13 1-20 14 15 9 25 15 33 9-9 6-19 15-27 1 25 18 27 8 49-6 14-26 21-41 12Z" className="schematic-flame" />
                <rect x="225" y="178" width="78" height="10" className="schematic-fuel" />
                <path d="M338 124c28-27 40 22 69-1s35 25 61-1" className="schematic-smoke" />
                <rect x="489" y="76" width="40" height="36" rx="3" className="schematic-detector" />
                <path d="M509 112v23" className="schematic-leader" />
                <text x="55" y="55" className="schematic-label">VENTILATION INPUT</text>
                <text x="222" y="207" className="schematic-label">FUEL SAMPLE</text>
                <text x="463" y="61" className="schematic-label">DETECTOR</text>
              </svg>
              <div className="landing-schematic__legend"><span>Cabin conditions + material</span><span>→</span><span>Model states + evidence</span></div>
            </div>
          </div>
        </section>

        <section className="landing-section landing-decision" id="decision" aria-labelledby="decision-title">
          <div className="landing-section__head landing-section__head--row">
            <div><p className="landing-kicker">MITIGATION REVIEW</p><h2 id="decision-title">A dashboard that can say “not known.”</h2></div>
            <p className="landing-section__intro">These status summaries reflect the model files and required inputs in this build. They do not imply a certified cabin risk score.</p>
          </div>
          <div className="landing-model-grid">
            {modelStates.map((model) => <article className="landing-model" key={model.name}>
              <div className="landing-model__line"><h3>{model.name}</h3>{model.theory ? <Link className="landing-state landing-state--theory" href={`/methods#model-${model.key}`} title="Open this model in Methods"><span>{model.label}</span> →</Link> : <span className="landing-state">{model.label}</span>}</div>
              <p>{model.detail}</p>
            </article>)}
            <article className="landing-model">
              <div className="landing-model__line"><h3>Missing input</h3><span className="landing-state landing-state--empty">No data</span></div>
              <p>Provide a cited threshold for the selected detector before interpreting alarm readiness or time-to-alarm. Empty inputs stay empty.</p>
            </article>
            <article className="landing-model">
              <div className="landing-model__line"><h3>Recommended next test</h3><span className="landing-state landing-state--empty">No scenario loaded</span></div>
              <p>After a run extrapolates beyond PSI-tested conditions, the result panel ranks which condition to test next by how much returning it to the tested envelope changes the modeled outcome. This is not a confidence interval.</p>
            </article>
          </div>
          <div className="landing-mitigation-row" aria-label="Mitigation factors represented in a run">
            <span>DETECTION <b>threshold required for readiness</b></span><span>VENTILATION <b>entered per scenario</b></span><span>SUPPRESSION <b>select CO₂ / N₂ / none</b></span><span>EVIDENCE QUALITY <b>PSI source + model scope</b></span><span>NEXT TEST <b>cite the missing threshold</b></span>
          </div>
        </section>

        <section className="landing-trust" id="trust" aria-labelledby="trust-title">
          <div><p className="landing-kicker">TRUST / LIMITS</p><h2 id="trust-title">Transparent by design.</h2><p>EmberAtlas is an exploration tool for evidence and model behavior. It is not flight certification.</p></div>
          <ul>
            <li><span>SI</span> Internal calculations use SI units; display conversions are labeled.</li>
            <li><span>RECEIPTS</span> Results expose accession, file, row, equation, and assumptions where available.</li>
            <li><span>NO DATA</span> Missing thresholds and missing channels stay ∅; no-data is not estimated away.</li>
            <li><span>BOUNDED</span> Partial gravity is bounded between available microgravity and 1 g evidence, not measured.</li>
            <li><span>SMALL n</span> Tiny training and holdout samples are called out alongside model scope.</li>
            <li><span>THEORY</span> Uncalibrated cabin heat-loss and smoke values remain theory-only.</li>
          </ul>
        </section>

        <section className="landing-final" aria-labelledby="final-title">
          <p className="landing-kicker">FLAME IN FREEFALL</p>
          <h2 id="final-title">Start with the evidence. Leave with a better test.</h2>
          <div className="landing-actions">
            <Link className="landing-button landing-button--primary" href="/simulator">Start a simulation <span aria-hidden="true">↗</span></Link>
            <Link className="landing-button landing-button--quiet" href="/methods">Methods &amp; validation</Link>
            <a className="landing-button landing-button--quiet" href={REPOSITORY} target="_blank" rel="noreferrer">Open repository ↗</a>
          </div>
        </section>
        <p className="landing-image-credit">IMAGE CREDIT · NASA / JSC, SoFIE-GEL aboard the International Space Station. <a href={NASA_IMAGE_SOURCE} target="_blank" rel="noreferrer">Original NASA source ↗</a></p>
      </div>
    </div>
  );
}
