# EmberAtlas — Pitch

## 30-second script

Saffire replay → ISS vs Lunar compare → AI interpretation → next test. EmberAtlas replays a real NASA PSI-100 cabin-fire record, compares it with measured temperature and pressure, then compares the same material under ISS and bounded lunar conditions. Every result carries its evidence and limitations. The OpenAI API turns reviewed engine output into a cited interpretation. When evidence is thin, EmberAtlas says so and proposes the next test to fly.

**One-liner:** EmberAtlas turns NASA's ISS fire experiments into a defensible fire-safety verdict for the materials going into lunar habitats, with every claim traced to the PSI data behind it.

## 30-second video script (~75 spoken words; English subtitles burned in)

| t | Beat | VO (spoken) |
|---|---|---|
| 0–4 s | Hook | "Artemis II: a smoke alarm, about eighty thousand miles from home." |
| 4–8 s | Problem | "Moon bases will breathe thirty-four percent oxygen. Will the cabin fabric burn?" |
| 8–12 s | Pick Lunar Habitat + SIBAL fabric | "Maya picks the Lunar Habitat and the fabric." |
| 12–18 s | Verdict + three answers | "EmberAtlas answers: will it burn, how bad, can we stop it — from NASA's ISS fire experiments." |
| 18–23 s | Receipt, then Earth test vs orbit | "Every number has a receipt. And the Earth test and orbit don't always agree." |
| 23–27 s | Export brief | "Export the evidence brief, sources included." |
| 27–30 s | Close | "EmberAtlas. Safer air for the next giant leap." |

About 74 words. Hook source: Aerospace America, "Artemis II astronauts praise Orion capsule, reflect on mission impact", https://aerospaceamerica.aiaa.org/artemis-ii-astronauts-praise-orion-capsule-reflect-on-mission-impact/ (also listed in CREDITS.md and SUBMISSION.md References).

Whatever verdict the app shows at recording time is the one the video shows. If it is "Data pending", record that. Do not stage a verdict.

## Backup deck (7 slides, including title)

1. **Title:** EmberAtlas: a defensible fire-safety verdict for lunar habitat materials. Team, challenge (Flame in Freefall), URL.
2. **Problem:** Moon habitats at 34% O₂ · 8.2 psia · 1/6 g (NTRS 20240003211). The Earth test is run at 1 g, and nobody has tested materials in lunar gravity. Persona: Maya, materials and fire-safety engineer.
3. **Product:** Review screen screenshot. Q1 Will it burn here? · Q2 How bad? · Q3 Can we catch it and stop it? Verdict states and the rules that produce them.
4. **Evidence:** PSI investigations used (FLEX verified; BASS-II, Saffire, SAME pending digitization). A receipt drawer. Earth vs orbit strip.
5. **Trust:** emberphys Python as the source of truth. TS port matches golden vectors at rtol 1e-6. Validation scoreboard with passes **and failures**. Numeric guard on Ask EmberAtlas.
6. **Action:** what to do (prevention, detection, suppression), next test to fly (SoFIE in CIR), Export Evidence Brief.
7. **Limits and next steps:** what is uncalibrated, partial gravity as a bounded estimate, the data still to digitize. Close line and URL.

## Judge map

| Criterion | Where it is proven |
|---|---|
| Impact | `/review`: verdict + What to do + Next test to fly for the Lunar Habitat default |
| Creativity | `/review` Earth test vs orbit strip; `/start` 3-step setup |
| Validity | `/methods#validation`, `docs/VALIDATION.md`, `shared/golden_vectors.json` |
| Relevance | `/` landing (Artemis lunar atmosphere framing); `/methods#verdict-rules` |
| Presentation | `/review?m=LunarHabitat&mat=sibal&present=1` (Presentation Mode); `docs/VIDEO_SHOTLIST.md` |
| Best Use of Data | `/evidence` (16 PSI investigations), receipt drawer on every number, Evidence used ranking |
| Best Use of Science | `web/lib/review/index.ts` (verdict rules), `/methods#verdict-rules`, `physics/emberphys` |
| Best Storytelling | `/` → `/start` → `/review` path following Maya |
| Best Mission Concept | `/review` Next test to fly (SoFIE in CIR); Export Evidence Brief |
| Test evidence | `web/tests/review.test.ts`, `web/tests/contracts.test.ts`, `web/tests/golden.test.ts` |

Note: `/methods` does not yet carry the `#verdict-rules` and `#validation` anchors (only `#references` exists). Add them before linking.
