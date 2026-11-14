import Link from "next/link";
import testPoints from "@/data/test_points.json";
import investigations from "@/data/investigations.json";
import summary from "@/data/validation/summary.json";
import { Mesh } from "@/components/landing/Mesh";

// Proof counts are computed from the shipped data at build time; nothing here is typed in by hand.
const VERIFIED = (testPoints as { verified?: boolean }[]).filter((t) => t.verified === true).length;
const N_INV = Object.keys(investigations as Record<string, unknown>).length;
const TARGETS = (summary as { targets: { status: string }[] }).targets;
const PASSED = TARGETS.filter((t) => t.status === "pass").length;

const ARTEMIS_URL = "https://aerospaceamerica.aiaa.org/artemis-ii-astronauts-praise-orion-capsule-reflect-on-mission-impact/";
const REPO = "https://github.com/K4RM-P/Flame-in-Freefal";

export default function Landing() {
  return (
    <div>
      <section className="relative isolate overflow-hidden px-6 py-16 md:py-24">
        <Mesh />
        <div className="mx-auto grid max-w-[1200px] items-center gap-10 lg:grid-cols-[3fr_2fr]">
          <div className="space-y-6">
            <p className="label">NASA Space Apps 2026 · Flame in Freefall</p>
            <h1 className="display text-[48px] leading-[1.05] md:text-[64px]">Will it burn on the Moon?</h1>
            <p className="measure text-[20px] text-mute">EmberAtlas turns NASA&apos;s ISS fire experiments into a defensible fire-safety verdict for the materials going into lunar habitats, with every claim traced to the PSI data behind it.</p>
            <div className="flex flex-wrap gap-3">
              <Link href="/start" className="btn-accent" data-testid="cta-start">Start a review</Link>
            </div>
          </div>
          <Link href="/review?m=LunarHabitat&mat=sibal" data-testid="preview-card" className="block border border-line bg-panel p-5 hover:border-mute" style={{ borderRadius: 8 }}>
            <p className="label mb-3">Live review: Lunar Habitat · SIBAL fabric</p>
            <p className="text-[16px] text-mute">The verdict is computed live from the verified orbit test rows, with its caveats and receipts.</p>
            <p className="mt-4 text-[16px] font-medium underline underline-offset-2">Open the live verdict →</p>
          </Link>
        </div>
      </section>

      <section data-theme="light" className="bg-bg px-6 py-20 text-ink">
        <div className="mx-auto grid max-w-[1200px] gap-12 lg:grid-cols-2">
          <div className="space-y-4">
            <p className="label">The problem</p>
            <p className="serif text-[32px] italic leading-snug">A material that passes on Earth has no PSI test in the air and gravity of a lunar habitat.</p>
            <p className="measure text-mute">On Artemis II, a smoke alarm went off ~80,000 miles from home. <a href={ARTEMIS_URL} className="underline underline-offset-2">Source: Aerospace America</a></p>
          </div>
          <ol className="space-y-6 text-[16px]">
            <li><span className="num block text-[24px]">34% O₂ · 8.2 psia</span><span className="text-mute">Lunar cabins are planned at an oxygen-enriched, reduced-pressure atmosphere.</span></li>
            <li><span className="block text-[24px]">Pass/fail in Earth gravity</span><span className="text-mute">Materials are approved with NASA-STD-6001 Test 1, a pass/fail burn test run in 1 g.</span></li>
            <li><span className="block text-[24px]">Scattered evidence</span><span className="text-mute">ISS fire evidence (BASS, Saffire, …) is spread across ~24 PSI investigations.</span></li>
          </ol>
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto max-w-[1200px]">
          <p className="label mb-2">Meet Maya</p>
          <p className="measure mb-6 text-mute">Maya is a fictional persona: a materials and fire-safety engineer on a lunar habitat program.</p>
          <div className="grid gap-6 md:grid-cols-3">
            {[["Before", "She must sign off cabin fabrics for 34% O₂ at 8.2 psia in 1/6 g. Her only tool is a 1 g pass/fail test, and the ISS evidence is scattered across ~24 PSI investigations."],
              ["With EmberAtlas", "She picks the cabin and the material and gets an evidence brief: the nearest orbit tests, whether they burned or went out, and where the data stops — each claim with a receipt."],
              ["After", "She brings a verdict she can defend in a design review, and knows which test would close the gap."]].map(([h, t]) => (
              <div key={h} className="border-t border-line pt-4"><p className="text-[20px] font-medium">{h}</p><p className="measure mt-2 text-mute">{t}</p></div>))}
          </div>
        </div>
      </section>

      <section className="px-6 pb-20">
        <div className="mx-auto max-w-[1200px]">
          <p className="label mb-6">How it works</p>
          <ol className="grid gap-px border border-line bg-line md:grid-cols-3">
            {[["1", "Choose material & cabin", "Pick the habitat atmosphere and the material going into it."],
              ["2", "Get the evidence brief", "The verdict, the ISS tests behind it, and every caveat, traced to PSI rows."],
              ["3", "Act and test", "Sign off, mitigate, or take the suggested test to close the gap."]].map(([n, h, t]) => (
              <li key={n} className="bg-bg p-6"><p className="num text-[13px] text-faint">{n}</p><p className="mt-1 text-[20px] font-medium">{h}</p><p className="mt-2 text-[14px] text-mute">{t}</p></li>))}
          </ol>
        </div>
      </section>

      <section className="px-6 pb-20">
        <div className="mx-auto max-w-[1200px]">
          <p className="label mb-6">Proof</p>
          <div className="grid gap-8 md:grid-cols-3">
            {[[`${VERIFIED}`, "verified ISS test points in the shipped dataset"],
              [`${N_INV}`, "PSI investigations catalogued"],
              [`${PASSED}/${TARGETS.length}`, "validation targets passed (the rest fail, are partial or wait on data — all shown)"]].map(([n, l]) => (
              <div key={l}><p className="num text-[32px]">{n}</p><p className="text-[13px] text-mute">{l}</p></div>))}
          </div>
          <Link href="/methods#validation" className="mt-6 inline-block text-[13px] underline underline-offset-2">See every check, including the ones that fail →</Link>
        </div>
      </section>

      <section className="px-6 pb-20">
        <div className="mx-auto grid max-w-[1200px] gap-8 border-t border-line pt-10 md:grid-cols-2">
          <div><p className="label mb-2">Impact</p><p className="text-[20px] font-medium">Artemis cabins and rovers</p><p className="measure mt-1 text-mute">Evidence-backed material decisions for the habitats and vehicles crews will live in.</p></div>
          <div><p className="label mb-2">&nbsp;</p><p className="text-[20px] font-medium">Oxygen-enriched settings on Earth</p><p className="measure mt-1 text-mute">The same method applies to hospital oxygen, submarines and aircraft.</p></div>
        </div>
      </section>

      <footer className="border-t border-line px-6 py-10 text-[13px] text-mute">
        <div className="mx-auto flex max-w-[1200px] flex-wrap gap-x-8 gap-y-2">
          <span>Built on <a href="https://psi.ndc.nasa.gov/" className="underline">NASA PSI Data Repository: Combustion Science</a>. Text credits only; no NASA logos.</span>
          <span>Use of AI: Claude Code wrote the code; the Claude API powers Ask EmberAtlas, grounded on tool outputs with a numeric guard. No AI-generated images.</span>
          <Link href="/methods" className="underline">Methods &amp; Validation</Link>
          <a href={REPO} className="underline">GitHub</a>
          <span>MIT License</span>
        </div>
      </footer>
    </div>
  );
}
