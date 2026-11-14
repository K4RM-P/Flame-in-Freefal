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
- `docs/REFERENCES.json` (read-only in this lane) still lists the Claude API as a runtime AI tool and "Ask agent"/"demo answers"; it should be updated to the OpenAI API by its owner. SUBMISSION.md describes the shipped state.
- README states the Earth-vs-orbit counts and max solid O₂ (22.2%) as of today with the source file; the UI computes them live.
- Deleted `docs/CLAUDE_SIMULATION_HUB_PROMPTS.md`. `docs/HUMAN_TASKS.md` trimmed to still-open human verification tasks.
