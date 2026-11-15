# Handoff to the UI session (from the core-fixes session, 2026-11-15)

- **Demo Numbers** button + `fillDemo` live in `web/components/sim/Onboarding.tsx` (and `web/e2e/demo.spec.ts`, `web/tests/ui.test.ts`). Not in `lib/`. Please remove them (real presets only) per docs/UPGRADE.md §5.
- **New component** `web/components/sim/DesignReview.tsx` ("Design review · ranked fixes"), mounted in `Workspace.tsx` right after the Next-test line. Minimal markup; please restyle. Data: `designReview()` in `web/lib/sim/designReview.ts` (`basis`: calibrated / theory-only / design-input; `inEnvelope`).
- **Result flag** `SimResult.flags.partial_g_nonconservative` — show it in the result strip; wording in `PARTIAL_G_CAVEAT` (`web/lib/sim/wording.ts`).
- `OutcomeMetric.theory_only` marks peak CO (and peak T while heat loss is uncalibrated); the label already says "(theory-only)".
- **Images:** import from `web/lib/media.ts` (`media.hero`, `media.saffire`, `media.candle`, `media.bass2`); `src` switches to `/nasa/*` once the files are self-hosted.
- **About page** content was cut to: one-liner, team names, data credits, Use of AI. Dead CSS for the removed IdeaOrbit / CrewCarousel / MissionLog (`ea-crew*`, orbit, mission-log classes) in `web/app/globals.css` can go.
- `withUnit()` in `web/lib/ui/format.ts` joins number + unit with a narrow no-break space; use it instead of `{sig(x)} {units}` in mono text.
- Strings changed in UI-owned files (text only): Shell footer caveat, Workspace assumptions/footer caveat and footer value, bits.tsx partial-g chip, Methods partial-g text, LandingPage/page.tsx image URLs → `media.*`, Crew layer default off in `store.ts`.
