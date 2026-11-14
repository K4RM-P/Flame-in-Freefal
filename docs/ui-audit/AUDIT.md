# UI self-audit (before) — 2026-11-14

Screenshots: `before/` at 1440×900 and 390×844. `/start` did not exist (404, no shot).

## Route map
`/` brief · `/console` · `/models/[spread|droplet|suppression|gravity|habitat|smoke|boundary]` · `/validation` · `/evidence` · `/gaps` · `/implications` · `/earth` · `/ask` · `/methods` · `/api/ask` (NDJSON).

## Per screen
| Screen | Purpose | Primary action | Confusing / broken / slow | Missing states |
|---|---|---|---|---|
| `/` | Pitch + mission picker | Open console | Six equal-weight mission buttons; no material; no product preview; no story | No first-run path |
| `/console` | Hero risk view | Read the map | No verdict sentence; accent used everywhere (contours, numbers, buttons); 4 cards equal weight; "bounded" gravity move is a static marker, no ghost or dimension; no burn-probability slot (honest ∅ missing); no scenario A/B | Empty/error states; receipt only via small ⓘ |
| `/models/*` | Calculators | Slide inputs | Inputs not grouped; no envelope tint on inputs | Skeleton on plot load only |
| `/validation` | Trust | Read scoreboard | Long table first; no summary of accuracy/precision/reliability; "why it fails" note crammed under quantity | — |
| `/evidence` | Ranking + data | Export | Three stacked sections, no view switch | Empty filter state |
| `/gaps` | Next test | — | Proposals not connected to Ask; no mission cell outline | — |
| `/ask` | Agent | Ask | Golden chips are a wall of text; no "current tool" thinking state | Error state offers no cached answer explicitly |
| 390 px | — | — | Mission Bar takes the whole first screen; 10-link nav wraps to two lines; map labels overflow | — |

## Top 10 problems (ranked by story/judge impact)
1. No verdict: the Console never answers "will it burn, how fast" in one sentence.
2. No first-run path (role → environment → material); material is buried in a dropdown.
3. Mission Bar is a form, not a search pill; eats the 390 px viewport.
4. Accent #FF6B35 overused (contours, every number, buttons, links) — nothing stands out.
5. Gravity toggle does not *show* the buoyant-equivalent shift (no ghost, no dimension line).
6. Receipts hidden behind a 24 px ⓘ; numbers are not clickable.
7. Validation Lab lacks a trust summary (accuracy / precision / reliability).
8. No scenario compare (ISS vs Lunar) — the core before/after of the story.
9. Landing has no story, no live surface, no stats row, no equation-as-proof.
10. Navigation: top link list instead of rail; no ⌘K; Ask is a floating orange button covering content.

## Data shapes the UI depends on
- `ModelResult` (`web/lib/physics/models.ts`): `{model_id, value, units, uncertainty{p05,p50,p95}, inputs, equation_ids, assumptions, validity{in_envelope, nearest_data_distance, calibrated, note?, quench_warning?}, sources, extra}`.
- Validation JSON (`web/data/validation/`): `summary.json.targets[] {id, model, quantity, published, predicted, criterion, status, source, note}`; `droplet_K.json`/`droplet_dext.json {metrics, parity[] {id, fuel, obs, pred, x_o2, P_kPa, diluent, source_id, locator}}`; `loi_curves.json`.
- `test_point` (`web/data/test_points.json`): see `lib/testPoints.ts`.
- Agent stream (`/api/ask`, NDJSON): `{type:"trace", name, input, output}` … `{type:"answer", answer, mode, guard{ok, unsupported, regenerated}, note?}`.
