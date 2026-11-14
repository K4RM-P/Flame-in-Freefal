# Status (after the judge-audit upgrade, 2026-11-14)

**Done:** routes `/`, `/simulator`, `/evidence`, `/methods`, `/about` (`/match` → `/evidence`, `/dashboard` → `/simulator`). Three presets (Saffire replay; Same fabric: ISS vs Lunar Habitat; Lunar Habitat: tune the response), one-click run via `?preset=iss-vs-lunar&run=1`. Evidence ranking gated by material class; envelope tolerance and distance-ranked next test; Compare delta card with EXTRAPOLATED badge. Landing page tells the Maya story with live counts. PSI ingest (2,818 rows), FLEX cross-check, held-out FLEX validation, SIBAL spread calibration, CSV export, OpenAI scenario builder / interpretation / match explanation with numeric guard.

**Theory-only:** cabin heat loss, smoke ageing and transport, suppression outside the fitted fuels; partial gravity is a bounded estimate between µg and 1 g.

**Unsourced:** Lunar Habitat volume (held equal to the ISS for a like-for-like comparison), Cygnus free volume (required input in the Saffire replay unless sourced), detector thresholds (alarm shows No data), current NASA-STD-3001 CO₂ limits.

**Skipped:** V6–V10 validation targets (PSI tables do not carry the needed quantities), heat-loss and smoke fits, partial-gravity flight data (none exists).

## Decisions made during the upgrade
- Landing trust strip computes PSI rows from `tables_index.json`, FLEX mismatches/values from `flex_crosscheck.json`, and the held-out FLEX MAPE and n from `web/data/validation/droplet_K.json` (`summary.json` has no `metrics` block; the metrics live in `droplet_K.json`).
- Landing is a server component (no hooks); the old Aster button, tiles, conceptual SVG, mitigation review and repeated caveat lists were removed.
- Methods: the Saffire replay is framed as a "Cabin-scale sanity check" next to the held-out SIBAL spread error (read from `spread.json`, n from its test split).
- About: bios replaced with project roles inferred from each member's previous focus line (Anujan: software and simulation; Karm: combustion research; Aaron: engineering and testing; Xuliang: team member). The team should confirm these.
- `docs/REFERENCES.json` regenerated from `physics/data/software.yaml` (OpenAI API at runtime; the stale Claude API / "Ask agent" / "demo answers" entries are gone).
- ISS volume: 388 m³ cited to NASA's Space Station Facts and Figures page (URL + locator in `physics/data/missions.yaml` and `web/data/missions.json`); status `cited`.
- Lunar volumes: the ISS vs Lunar preset holds B's volume equal to A's; the Lunar tune preset uses the ISS volume. Both carry `{source_id: "design input", note: "held equal to Scenario A …"}` provenance.
- Cygnus volume: no stated Saffire-III free volume in `saffire_ntrs.yaml` or `sources.yaml` (the Saffire-IV 17.9 m³ is a different flight), so the replay keeps it as its single required field with the hint "Enter the Cygnus free volume (not stated in PSI-100)".
- Envelope tolerance: degenerate tested ranges (min == max) widen by ±5 % pressure, ±0.01 x_O₂, ±20 % flow; non-degenerate ranges get 1 % slack so a value equal to a table entry to rounding is not flagged (the lunar 5.0 cm/s vs SIBAL's 5.03 cm/s minimum).
- Next test ranks out-of-envelope inputs by normalised distance (scales 0.05 x_O₂, 20 kPa, 10 cm/s, 0.5 g) and returns null inside the envelope; the old "changes the predicted outcome by N %" wording is gone.
- Evidence ranking: tiers burned-this-material → same solid class → ACME BRE (PSI-20, only when x_O₂ ≥ 0.26) → smoke (SAME, SAME-R, DAFT PSI-47) → liquid droplets (suppression role only), with condition distance as the tiebreaker.
- Removed the free-form "Ask" chat (`app/api/ask`, `lib/ai/ask.ts`, Assistant tab) so the simulator keeps one AI surface (scenario builder + interpretation); the Evidence page keeps the match explanation.
- README states the Earth-vs-orbit counts and max solid O₂ (22.2%) as of today with the source file; the UI computes them live.
- Deleted `docs/CLAUDE_SIMULATION_HUB_PROMPTS.md`. `docs/HUMAN_TASKS.md` trimmed to still-open human verification tasks.
