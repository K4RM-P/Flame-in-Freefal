// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Reproduces the "AI-built scenario shows no fire" bug: 5 prompts → scenario builder (local parser; the OpenAI
// path shares the same gap filler) → simulate() → frame.ts. Run: pnpm -C web exec tsx scripts/ai-fire-check.ts
import { buildLocal, materialOf } from "@/lib/ai/localScenario";
import { simulate } from "@/lib/sim/engine";
import { firstBurningFrame, noFireReason } from "@/lib/sim/noFire";
import { visualState } from "@/components/sim/scene3d/frame";

export const PROMPTS = [
  "ISS module, cotton fabric panel catches fire",
  "Moon base at 34% oxygen with a Nomex curtain",
  "Cygnus cargo ship, paper burning",
  "lunar habitat, ignition near a cable bundle",
  "empty ISS module",
];
for (const p of PROMPTS) {
  const d = buildLocal(p);
  const s = d.scenario!;
  const r = s.items.length ? simulate(s) : null;
  const fb = firstBurningFrame(r);
  const nf = noFireReason(s, r, d.rejected);
  const vs = r ? visualState(s, r, Math.max(0, fb)) : null;
  console.log(`\n=== ${p}`);
  console.log(`  items=${s.items.length} fireSources=${s.items.filter((i) => i.ignite).length}`);
  for (const it of s.items) { const m = materialOf(it.material_key); console.log(`  - ${it.id}: material=${it.material_key} inLibrary=${!!m} spreadModel=${!!m?.ignitable} ignite=${it.ignite} t_ignite=${it.t_ignite_s}s targetsExisting=${s.items.some((x) => x.id === it.id)}`); }
  console.log(`  firstBurningFrame=${fb}${r && fb >= 0 ? ` (t=${r.t[fb]} s)` : ""} extinguish=${r?.items.map((i) => i.extinguish_reason ?? "—").join(",") ?? "no run"}`);
  console.log(`  visual: ${vs ? `hasRun=${vs.hasRun} flame=${vs.items.map((i) => i.flamePresent).join(",")} Q=${vs.hud.Q_W?.toFixed(1)} W` : "none"}`);
  console.log(`  noFire: ${nf ? `${nf.title} — ${nf.detail} | fix: ${nf.fix?.label ?? "none"}` : "— (fire shown)"}`);
  if (d.rejected.length) console.log(`  rejected: ${d.rejected.map((x) => x.reason).join("; ")}`);
}
