"use client";
// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Post-processing: N8AO (crevice darkness), Bloom (flame + LEDs only: emissive > 1, threshold 1.0), vignette, SMAA.
// Degrade ladder driven by <PerformanceMonitor>: level 1 drops AO, 2 drops bloom, 3 drops shadows, 4 sets DPR 1.
import { Bloom, EffectComposer, N8AO, SMAA, Vignette } from "@react-three/postprocessing";

export function Effects({ level }: { level: number }) {
  if (level >= 2) return <EffectComposer multisampling={0} enableNormalPass={false}><Vignette offset={0.3} darkness={0.55} /><SMAA /></EffectComposer>;
  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      {level < 1 ? <N8AO aoRadius={0.35} distanceFalloff={0.6} intensity={2.2} halfRes quality="medium" /> : <></>}
      <Bloom luminanceThreshold={1} luminanceSmoothing={0.15} intensity={0.9} mipmapBlur radius={0.7} />
      <Vignette offset={0.3} darkness={0.55} />
      <SMAA />
    </EffectComposer>
  );
}
