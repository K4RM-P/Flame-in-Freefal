# EmberAtlas: 20-second live demo

All numbers below are printed by `pnpm -C web exec tsx scripts/engine-check.ts` (engine 1.0.0, nominal run, seed 20261114). Re-run it after any data or engine change and update this file; the pitch deck copies from here.

## Script (20 s)

1. **(0–8 s) `/simulator?preset=iss-vs-lunar&run=1`: same SIBAL fabric, same response** (crew detects at t = 30 s, fan off, 2 kg CO₂ 30 s later; all design inputs, not NASA measurements).
   - **ISS:** alarm 30 s → fan off 30 s → **fire out at 30 s** (no airflow in µg: the flame quenches as soon as the fan stops) → CO₂ released 60 s, after the fire is already out. Peak heat 2 580 W; burnt area 0.0355 m².
   - **Moon base (34 % O₂, 56.5 kPa, 1/6 g):** alarm 30 s → fan off 30 s → CO₂ released 60 s → **the fire keeps burning and only stops when the fabric is used up, at 171 s.** Peak heat 4 900 W; burnt area 0.382 m² (all of it). The 2 kg CO₂ charge does not put it out.
   - Say: "Same fabric, same crew response. On the ISS, cutting the fan puts the fire out. On the Moon, buoyancy keeps it going and the extinguisher fails. And 1/6 g is an estimate that may be non-conservative: NASA's FM2 tests found lunar gravity can be worse than both."
2. **(8–16 s) preset `lunar-design-review` ("Moon base: find the gaps") → Design review · ranked fixes:**
   1. **Give the detector an alarm level / detection path:** agent release never → 60 s. Today the CO₂ extinguisher never fires (no sourced smoke yield for SIBAL, no detector threshold, no crew-detection input). Even with it, time to extinguish 170 s → 171 s: the 2 kg charge does not put this fire out, so size the agent next.
   2. **SIBAL Fabric is untested at this O₂:** cabin 34 % O₂ vs tested 16.4–22.1 % O₂. Every prediction here is an extrapolation.
   3. **Set cabin O₂ to 29.2 %** (the lowest O₂ that keeps the crew above the 16.5 kPa ppO₂ floor at 56.5 kPa): peak heat 4 920 W → 4 040 W. Calibrated spread model, but outside the PSI envelope and a partial-gravity estimate.
3. **(16–20 s) Next test to fly:** open the next-test line: fly SIBAL at 34 % O₂ and 56.5 kPa; 1/6 g needs a partial-gravity platform.

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
