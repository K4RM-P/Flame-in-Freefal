# 30-second video shot list (matches docs/PITCH.md script)

Record on the production URL with Presentation Mode: 125% type, collapsed rail, cursor ring. Set `DEMO_MODE=1` so any Ask answers are the cached, deterministic ones. Monte Carlo is seeded, so every take shows the same numbers.

Direct entry for retakes: `/review?m=LunarHabitat&mat=sibal&present=1`
Story path: `/` → `/start` → `/review` → receipt → Earth vs orbit → Export.

| # | t | Screen / click | On-screen state | VO |
|---|---|---|---|---|
| 1 | 0–4 s | `/?present=1` landing hero | Hero headline over the mesh | "Artemis II: a smoke alarm, about eighty thousand miles from home." |
| 2 | 4–8 s | Hold on hero, cursor to **Check a material** | Lunar atmosphere line (34% O₂ · 8.2 psia · 1/6 g) visible | "Moon bases will breathe thirty-four percent oxygen. Will the cabin fabric burn?" |
| 3 | 8–12 s | Click → `/start` → *Lunar Habitat* → *SIBAL fabric* | Step progress fills; lands on `/review?m=LunarHabitat&mat=sibal&present=1` | "Maya picks the Lunar Habitat and the fabric." |
| 4 | 12–18 s | `/review`: hold on the verdict sentence, then pan across Q1 / Q2 / Q3 | Verdict as the app computes it (may be "Data pending"; do not stage), with the partial-gravity bounded-estimate caveat visible | "EmberAtlas answers: will it burn, how bad, can we stop it — from NASA's ISS fire experiments." |
| 5 | 18–20 s | Click a result number (`data-receipt`) | Receipt drawer: test rows, rule, source chip (PSI / NTRS locator) | "Every number has a receipt." |
| 6 | 20–23 s | Close the drawer, scroll to **Earth test vs orbit** | NASA-STD-6001 Test 1 (1 g) beside the orbit strip; caveat "Under these conditions; not a verdict on the standard." | "And the Earth test and orbit don't always agree." |
| 7 | 23–27 s | Click **Export Evidence Brief** | Print preview of the brief, with Markdown download shown | "Export the evidence brief, sources included." |
| 8 | 27–30 s | Back to `/` wordmark | "Built on NASA PSI data" + URL | "EmberAtlas. Safer air for the next giant leap." |

Rules:
- Subtitles are English and burned in.
- No NASA logos.
- No AI-generated images or video. Anything AI-generated that is added must be watermarked and disclosed in docs/SUBMISSION.md.
- The Artemis II hook needs a cited source in CREDITS.md (TODO_VERIFY). Without one, use "In space, fire is the emergency you can't run from."
- Any NASA footage must be listed in CREDITS.md with its URL and "NASA media, public domain; NASA does not endorse this project."
