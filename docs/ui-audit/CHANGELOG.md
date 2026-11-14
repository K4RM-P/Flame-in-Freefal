# UI changelog — mapped to the top-10 audit problems (AUDIT.md)

| # | Problem | Fix |
|---|---|---|
| 1 | No verdict | Console verdict sentence generated from ModelResults (`lib/ui/console.ts`), status chip, ISS comparison, receipt link |
| 2 | No first-run path | `/start`: role → environment → material, 3 steps, skippable, instant verdict; stored in URL + localStorage |
| 3 | Form-style mission bar eats 390 px | Airbnb-style Mission Search Pill with popovers (histograms on O₂ and pressure); collapses to "Mission ▸" sheet on mobile |
| 4 | Accent overuse | Accent limited to mission marker + primary action; data in Okabe–Ito; numbers neutral |
| 5 | Gravity shift invisible | Sliding segmented control; marker transitions, µg ghost, dimension line "+X cm/s buoyant-equivalent flow" |
| 6 | Receipts hidden | Every result number is a button → Receipt drawer (Equation · Inputs · Assumptions · Validation · Data · Sources; copy/export) |
| 7 | No trust summary | Validation Lab: Accuracy / Precision / Reliability dials (derived in `lib/ui/trust.ts`), scoreboard with ✓ ✗ — and "Why it fails" |
| 8 | No scenario compare | "Pin as A" in top bar and Console; cards show A value and ▲▼ % |
| 9 | Landing without story | Hero + live mini-console, problem facts (ivory), Maya before/with/after, bento, equation-as-proof (V5 parity), stats, message ladder |
| 10 | Navigation | Linear-style top bar + collapsible rail with single-key shortcuts, ⌘K palette, `/` Ask, `?` shortcuts, right-side drawers |
