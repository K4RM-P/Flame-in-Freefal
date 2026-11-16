# EmberAtlas: 20-second live demo

All numbers below are printed by `pnpm -C web exec tsx scripts/engine-check.ts` (engine 1.0.0, nominal run, seed 20261114). Re-run it after any data or engine change and update this file; the pitch deck copies from here.

## Script (30 s, the Space Apps limit)

1. **(0–8 s) `/simulator?preset=iss-vs-lunar&run=1`: same SIBAL fabric, same response** (crew detects at t = 30 s, fan off, 2 kg CO₂ 30 s later; all design inputs, not NASA measurements).
   - The verdict strip reads **"Fire lasts 5.7× longer in Lunar Habitat · ISS out at 30 s (quenched) · Lunar Habitat 171 s (burned out)"**; *Why?* explains each end.
   - **ISS:** alarm 30 s → fan off 30 s → **fire out at 30 s**: in µg nothing moves the air once the fan stops, so the flame drops below the 5 cm/s low-flow quench limit (BASS-II, still TODO_VERIFY) → CO₂ released at 60 s, after the fire is already out. Peak heat 2 580 W.
   - **Moon base (34 % O₂, 56.5 kPa, 0.165 g):** buoyancy keeps air moving past the flame, so it **burns the whole sample by 171 s**; the 2 kg CO₂ does not put it out. Peak heat 4 900 W.
2. **(8–14 s) Ask Aster: "Why does the Moon fire last longer?"** The answer comes from the run (*This run: ISS vs Lunar Habitat*), with 17 numbers checked against the engine and citations PSI-98 / PSI-99 / PSI-100 (SAFFIRE, the fabric), PSI-25 (BASS-II, the quench limit) and NTRS 20240015307 (FM2, quoted: SIBAL burns downward at lunar g but extinguishes at 1 g, so 1/6 g may be non-conservative). Works with no OpenAI key.
3. **(14–22 s) Preset `lunar-design-review` → AI analyst → Design review · Apply & re-run on fix #1** (*Give the detector an alarm path*: agent release never → 60 s). The **What changed** card lists the change (crew detection not set → t = 30 s) and the outcomes side by side: time to extinguish 170 s → 171 s, still burned out, so the 2 kg charge is too small. Size the agent next.
4. **(22–30 s) Next test → "See this cabin on NASA's tested envelope"**: the Evidence chart shows every PSI solid tested at 101 kPa and 14–22 % O₂, and the lunar cabin star far outside all of them ("outside the tested range of every PSI solid"). *Download test brief* gives the one-page proposal: fly SIBAL at 34 % O₂ and 56.5 kPa on SoFIE; 1/6 g needs a partial-gravity platform.

Also worth showing if there is time: *More → Copy link to this run* (the link re-runs the exact scenario), Methods search (press `/`, type "quench"), and `/credits`.

## Engine check output (verbatim)

```text

=== iss-vs-lunar A (ISS) ===
events:
  t=0 s  ignition [item-1]: SIBAL Fabric ignited
  t=30 s  alarm: crew-reported alarm (design input)
  t=30 s  fan_off: ventilation stopped on alarm
  t=30 s  extinguished [item-1]: quench: equivalent flow below the low-flow quench limit
  t=60 s  agent_released: 2 kg CO2 released (45.4 mol)
outcome:
  time_to_alarm = 30.00 s
  time_to_extinguish = 30.00 s
  peak_T = 298.4 K
  min_o2 = 2.127e+4 Pa
  peak_co = 4.359e-8 mol/mol
  peak_co2 = 0.002869 mol/mol
  peak_Q = 2582 W; burnt area = 0.03551 m²; flags = {"partial_g_nonconservative":false}
warnings:
  - No sourced smoke yield for at least one burning material: its smoke is not counted at the detector.
  - No sourced detector threshold: the alarm comes from the crew-detection design input (t = 30 s, not a NASA measurement).
  - habitat sub-model is theory-only (not calibrated on PSI data).
  - smoke sub-model is theory-only (not calibrated on PSI data).
  - sibal: inerting check uses the 1 g cup-burner T_crit reference (no µg calibration for this material).
design review (top 5):
  1. [calibrated] Set cabin O₂ to 16.4 %: peak_Q 2 580 W → 1 820 W
     Peak heat release 2 580 W → 1 820 W (PSI-tested O₂ range ∪ scenario).

=== iss-vs-lunar B (Lunar Habitat) ===
events:
  t=0 s  ignition [item-1]: SIBAL Fabric ignited
  t=30 s  alarm: crew-reported alarm (design input)
  t=30 s  fan_off: ventilation stopped on alarm
  t=60 s  agent_released: 2 kg CO2 released (45.4 mol)
  t=171 s  extinguished [item-1]: burnout: flame front reached the end of the item
outcome:
  time_to_alarm = 30.00 s
  time_to_extinguish = 171.0 s
  peak_T = 300.5 K
  min_o2 = 1.920e+4 Pa
  peak_co = 8.361e-7 mol/mol
  peak_co2 = 0.005328 mol/mol
  peak_Q = 4902 W; burnt area = 0.3816 m²; flags = {"partial_g_nonconservative":true}
warnings:
  - No sourced smoke yield for at least one burning material: its smoke is not counted at the detector.
  - No sourced detector threshold: the alarm comes from the crew-detection design input (t = 30 s, not a NASA measurement).
  - Partial gravity (1/6 g) is estimated between µg and 1 g. NASA's FM2 lunar-gravity tests show some materials burn more readily at lunar g than at either, so this estimate may be non-conservative. PSI has no partial-gravity fire data (FM2: ntrs-20240015307, outside PSI).
  - SIBAL Fabric: O₂ 34.0 % is outside its PSI test range 16.4–22.1 %.
  - Pressure 56.5 kPa is outside the PSI solid-fuel test range 101–101 kPa (PSI-26, PSI-25, PSI-98, PSI-99, PSI-100).
  - habitat sub-model is theory-only (not calibrated on PSI data).
  - smoke sub-model is theory-only (not calibrated on PSI data).
  - sibal: inerting check uses the 1 g cup-burner T_crit reference (no µg calibration for this material).
design review (top 5):
  1. [design-input, outside envelope] SIBAL Fabric is untested at this O₂: x_o2 34 % O₂ → 22.1 % O₂
     The ignition material SIBAL Fabric was tested only at 16.4–22.1 % O₂; this cabin runs 34 % O₂. Its predictions here are extrapolations: test it at this O₂ or swap it for a material tested there.
  2. [calibrated, outside envelope] Set cabin O₂ to 29.2 %: peak_Q 4 900 W → 4 030 W
     Peak heat release 4 900 W → 4 030 W (PSI-tested O₂ range ∪ scenario, low end floored at the crew minimum ppO₂). Outside the PSI-tested envelope. Partial-gravity estimate (may be non-conservative), not a measurement.

=== lunar-design-review (Moon base: find the gaps) ===
events:
  t=0 s  ignition [item-1]: SIBAL Fabric ignited
  t=170 s  extinguished [item-1]: burnout: flame front reached the end of the item
outcome:
  time_to_alarm = null s
  time_to_extinguish = 170.0 s
  peak_T = 300.5 K
  min_o2 = 1.920e+4 Pa
  peak_co = 8.415e-7 mol/mol
  peak_co2 = 0.0002172 mol/mol
  peak_Q = 4921 W; burnt area = 0.3816 m²; flags = {"partial_g_nonconservative":true}
warnings:
  - No sourced smoke yield for at least one burning material: its smoke is not counted at the detector.
  - No data (no sourced detector threshold): the alarm time is not computed; the run proceeds.
  - Partial gravity (1/6 g) is estimated between µg and 1 g. NASA's FM2 lunar-gravity tests show some materials burn more readily at lunar g than at either, so this estimate may be non-conservative. PSI has no partial-gravity fire data (FM2: ntrs-20240015307, outside PSI).
  - SIBAL Fabric: O₂ 34.0 % is outside its PSI test range 16.4–22.1 %.
  - Pressure 56.5 kPa is outside the PSI solid-fuel test range 101–101 kPa (PSI-26, PSI-25, PSI-98, PSI-99, PSI-100).
  - habitat sub-model is theory-only (not calibrated on PSI data).
  - smoke sub-model is theory-only (not calibrated on PSI data).
  - sibal: inerting check uses the 1 g cup-burner T_crit reference (no µg calibration for this material).
design review (top 5):
  1. [design-input] Give the detector an alarm level / detection path: time_to_agent never → 60 s
     The 2 kg CO2 extinguisher never fires: no alarm can trigger (no sourced smoke yield or detector threshold, no crew-detection input). With crew detection at t = 30 s (design input), the agent is released at 60 s; time to extinguish 170 s → 171 s. Even then the 2 kg charge does not put this fire out (it ends by burnout): size the agent next.
  2. [design-input, outside envelope] SIBAL Fabric is untested at this O₂: x_o2 34 % O₂ → 22.1 % O₂
     The ignition material SIBAL Fabric was tested only at 16.4–22.1 % O₂; this cabin runs 34 % O₂. Its predictions here are extrapolations: test it at this O₂ or swap it for a material tested there.
  3. [calibrated, outside envelope] Set cabin O₂ to 29.2 %: peak_Q 4 920 W → 4 040 W
     Peak heat release 4 920 W → 4 040 W (PSI-tested O₂ range ∪ scenario, low end floored at the crew minimum ppO₂). Outside the PSI-tested envelope. Partial-gravity estimate (may be non-conservative), not a measurement.
```
