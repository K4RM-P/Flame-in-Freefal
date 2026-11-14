// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
import { EQUATIONS } from "@/lib/equations";
import { SOURCES } from "@/lib/sources";
import { Tex } from "@/components/Tex";
import { SourcePill } from "@/components/bits";
import { ValidationLab } from "@/components/methods/ValidationLab";
import { MODEL_IDS } from "@/components/methods/modelIds";
import { ModelDetails } from "@/components/methods/ModelDetails";
import { RULES } from "@/lib/review/rules";

const VERDICT_LABEL: Record<string, string> = { pending: "Pending", likely: "Likely to sustain fire", acceptable: "Acceptable margin", marginal: "Marginal", no_burn_data: "No orbit burn data" };
const DATA_AUDIT = "https://github.com/K4RM-P/Flame-in-Freefal/blob/emberatlas-build/docs/DATA_AUDIT.md";

const LIBS = ["openpyxl", "xlrd", "Next.js 15", "React 19", "Tailwind CSS 3", "Plotly.js 3 / react-plotly.js", "KaTeX", "Zustand", "Zod", "Anthropic TypeScript SDK (Claude API)", "Vitest",
  "NumPy", "SciPy", "pandas", "PyArrow", "scikit-learn", "PyYAML", "pdfplumber", "pytest"];

export default function Methods() {
  return (
    <div className="prose-invert max-w-6xl space-y-6 text-sm">
      <h1 className="display text-[32px]">Methods &amp; Validation</h1>
      <nav aria-label="On this page" className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-mute">
        {[["verdict-rules", "Verdict rules"], ["validation", "Validation"], ["models", "Models"], ["limitations", "Limitations"], ["use-of-ai", "Use of AI"], ["references", "References"]].map(([id, l]) => <a key={id} href={`#${id}`} className="underline underline-offset-2">{l}</a>)}
        <a href={DATA_AUDIT} className="underline underline-offset-2">Data audit</a>
      </nav>
      <section className="card space-y-2" id="verdict-rules">
        <h2 className="label">Verdict rules</h2>
        <p className="text-mute">How the Review turns orbit test outcomes into a verdict. Rules are applied as written; partial gravity never upgrades a verdict.</p>
        <dl className="space-y-2">
          {Object.entries(RULES.verdictText).map(([k, t]) => <div key={k}><dt className="font-medium">{VERDICT_LABEL[k] ?? k}</dt><dd className="text-mute">{t}</dd></div>)}
        </dl>
        <p className="text-mute">Earth-gravity comparisons: {RULES.earthCaveat}</p>
      </section>
      <section className="card space-y-1" id="data-audit">
        <h2 className="label">Data audit</h2>
        <p>Every row, its source locator and its verification status are listed in the <a href={DATA_AUDIT} className="underline underline-offset-2">data audit (docs/DATA_AUDIT.md)</a>. Models train only on verified rows; held-out test rows are never fitted.</p>
      </section>
      <section className="card space-y-2">
        <h2 className="label">Pipeline</h2>
        <ol className="ml-5 list-decimal space-y-1">
          <li><b>Fetch</b> NASA/TP-2015-216046 (FLEX) from NTRS; SHA-256 recorded.</li>
          <li><b>Extract</b> Table IX (276 tests) with pdfplumber; extinction mode taken only from the authors&apos; Appendix B captions (radiative/diffusive; cool-flame captions → radiative with an &quot;inferred&quot; flag, per Dietrich et al. 2014).</li>
          <li><b>Normalize</b> to SI, carrying O₂ as x<sub>O₂</sub>, p<sub>O₂</sub> and Y<sub>O₂</sub>; FLEX-114 excluded (pressure printed as 0).</li>
          <li><b>Verify</b>: rendered PDF page compared cell-by-cell with extracted values (35 rows, 0 mismatches); human countersign pending.</li>
          <li><b>Split</b> by test campaign (grouped, seeded, 25% held out). <b>Fit</b> on train only. <b>Validate</b> on test and published LOIs.</li>
          <li><b>Export</b> JSON for the web; TypeScript ports reproduce 1,400+ Python golden vectors to 1e-6 relative.</li>
        </ol>
      </section>
      <section className="card">
        <h2 className="label">Equations</h2>
        {Object.entries(EQUATIONS).map(([id, e]) => (
          <div key={id} className="mt-2 border-b border-line pb-2"><div className="text-xs text-mute">{id} · {e.text} <SourcePill id={e.ref} /></div><Tex tex={e.tex} block /></div>
        ))}
      </section>
      <section className="card space-y-1" id="data">
        <h2 className="label">NASA data</h2>
        <p>Primary NASA resource (challenge Resources tab): <a className="text-ink underline" href="https://psi.nasa.gov/physci/repo/search?q=combustion" data-testid="psi-resource-link">PSI Data Repository: Combustion Science</a>.
          EmberAtlas reads PSI investigation metadata, DOIs and Experimental tables through the public PSI API (GET only; no zips or video) and cites every
          record by its PSI accession (PSI-xx) plus file name and line.</p>
      </section>
      <section id="validation" className="scroll-mt-20"><ValidationLab /></section>
      <section id="models" className="card space-y-2 scroll-mt-20">
        <h2 className="label">Models</h2>
        <p className="text-mute">Each model with its equations, inputs and p05–p95 band. Open one to run it against the current mission.</p>
        {MODEL_IDS.map((id) => <ModelDetails key={id} id={id} />)}
      </section>
      <section className="card space-y-1" id="limitations" data-testid="limitations">
        <h2 className="label">Limitations</h2>
        <ul className="ml-5 list-disc space-y-1">
          <li><b>Small n.</b> Many flight results are single tests; SAFFIRE-II has one test per material and thickness (7 like-for-like samples in Earth test vs orbit).</li>
          <li><b>Like-for-like caveats.</b> Comparisons hold only for the same material, thickness, O₂, flow speed and direction, and never as a verdict on a ground test standard.</li>
          <li><b>Calculated vs measured.</b> Flame temperatures (Burke–Schumann, T<sub>crit</sub>) are ideal calculated values; spread, habitat and smoke models are uncalibrated theory.</li>
          <li><b>No partial-gravity data in PSI.</b> Moon and Mars values are bounded estimates between µg and 1 g.</li>
          <li><b>Extracted and digitized values.</b> FLEX rows were extracted from NASA/TP-2015-216046 and cross-checked against the PSI-69 table (0 mismatches in 1,533 values); PSI table rows stay verified=false until the human spot-check. No values are hand-digitized from figures yet.</li>
          <li>The droplet model under-predicts the heptane LOI and both models miss the helium effect (non-unity Lewis number); see the Validation Lab.</li>
          <li>Many property values are literature candidates marked TODO_VERIFY in physics/data/*.yaml pending a science-checker review.</li>
          <li>Not for engineering certification. AI answers are generated from tool outputs and may still be wrong; verify.</li>
        </ul>
      </section>
      <section className="card space-y-1">
        <h2 className="label">Use it</h2>
        <pre className="overflow-x-auto rounded bg-bg p-2 font-mono text-xs">{`pip install "git+https://github.com/K4RM-P/Flame-in-Freefal.git#subdirectory=physics"
python -c "from emberphys.models import run_droplet; print(run_droplet('n-heptane', 0.21, 101.3, 3.0).value)"`}</pre>
        <p>License: MIT. Cite as: EmberAtlas team (2026), <i>EmberAtlas: validated microgravity fire-safety models on NASA PSI data</i>, NASA Space Apps Challenge.</p>
      </section>
      <section className="card space-y-1" id="use-of-ai">
        <h2 className="label">Use of AI</h2>
        <ul className="ml-5 list-disc space-y-1">
          <li>Claude Code (Anthropic) wrote the code, under human direction and review.</li>
          <li>The Claude API powers Ask EmberAtlas. Answers are grounded only on tool outputs (model runs, PSI rows, cited sources); a numeric guard (lib/ai/guard.ts) rejects any number not present in those outputs.</li>
          <li>No AI-generated images are used anywhere in EmberAtlas.</li>
        </ul>
      </section>
      <section className="card" id="references">
        <h2 className="label">References</h2>
        <ul className="ml-5 list-disc space-y-1">
          {Object.values(SOURCES).map((s) => <li key={s.id}><span className="num text-xs text-mute">[{s.id}]</span> {s.title}{s.year ? ` (${s.year})` : ""}{s.url && <> — <a className="text-ink" href={s.url}>{s.url}</a></>}</li>)}
          {LIBS.map((l) => <li key={l}>Software: {l}</li>)}
        </ul>
      </section>
    </div>
  );
}
