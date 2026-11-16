# EmberAtlas pitch

> EmberAtlas: the firefighter for space. It shows where and how a fire would start in your spacecraft, and which design change prevents it. Built on NASA's ISS fire data, explained by AI.

## 30-second script (English subtitles, ~80 words)
1. *(Aerospace America headline)* "On Artemis II, a smoke alarm went off in Orion."
2. "In space, fire is hard to see, and there's nowhere to run."
3. "Maya approves fabrics for a Moon base breathing 34% oxygen. Nobody can tell her if they're safe."
4. *(/simulator, ISS vs Moon)* "EmberAtlas finds it: same fabric, same crew response. On the ISS, cutting the fan puts it out at 30 seconds. On the Moon it beats the extinguisher and burns until 171 seconds."
5. *(Design review)* "And it prevents it: fix number one, the extinguisher never fires."
6. *(next-test line)* "Then it names the test NASA should fly next. EmberAtlas: the firefighter for space."

Numbers in beats 4–5 come from `docs/DEMO_SCRIPT.md` (engine check); re-run `pnpm -C web exec tsx scripts/engine-check.ts` before recording. The 30 s alarm, fan-off and 2 kg CO₂ are design inputs, not NASA measurements.

## 7-slide outline
1. **Hook:** Artemis II smoke alarm in Orion (Aerospace America).
2. **The problem:** fire in space is hard to see (no buoyant plume in µg) and impossible to escape.
3. **Maya:** approving fabrics for a 34% O₂ · 56.5 kPa · 1/6 g Moon base; no solid in PSI was burned above 22.2% O₂, so nobody can tell her if it's safe.
4. **EmberAtlas: Find · Explain · Prevent.** ISS vs Moon run: ISS fire out at 30 s on fan-off; Moon fire outlasts 2 kg CO₂, burnout at 171 s; peak heat 2 580 W vs 4 900 W.
5. **Prevent:** design review on "Moon base: find the gaps": (1) give the detector an alarm path (the extinguisher never fires); (2) SIBAL untested at 34% O₂; (3) cabin O₂ 29.2% (crew ppO₂ floor) cuts peak heat 4 920 W → 4 040 W.
6. **Trust + next test:** every value traces to a PSI accession or is a labelled design input; spread validated on n = 1 held-out sample (29.3% error); CO/smoke theory-only; 1/6 g may be non-conservative (FM2). Next test: SIBAL at 34% O₂ and 56.5 kPa.
7. **Team, use of AI** (Claude Code built it; OpenAI API explains runs, with a numeric guard; the design review works without AI), live app https://emberatlas-five.vercel.app.

## Judge map
- **Impact:** `/simulator?preset=iss-vs-lunar&run=1` (one-click ISS vs Moon fire) and the *Moon base: find the gaps* design review.
- **Creativity:** `/evidence#earth-vs-orbit` and `/evidence#where-evidence-stops` tables.
- **Validity:** `/methods#validation` (held-out FLEX, SIBAL spread, cabin-scale sanity check) and `/methods#limitations`.
- **Relevance:** `/evidence` and `/methods#data`: every PSI accession, file and row used.
- **Presentation:** `/` (10-second read) and the Compare delta card in `/simulator`.
