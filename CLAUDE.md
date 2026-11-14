# EmberAtlas — rules for Claude Code
Spec: docs/PRD.md (authoritative). Status: docs/STATUS.md. Human tasks: docs/HUMAN_TASKS.md.
- Science source of truth = physics/emberphys (Python). TS ports must match shared/golden_vectors.json (rtol 1e-6).
- Never hard-code a property, constant, limit or data value in code. Read from physics/data/*.yaml or processed data, each with source.
- Unknown value → TODO_VERIFY in yaml + entry in docs/HUMAN_TASKS.md. Never guess silently.
- Internal units SI (K, Pa, m, s, kg). Convert only at I/O. Carry O2 as x_o2, p_o2, and y_o2.
- Every model returns ModelResult {value, units, uncertainty{p05,p50,p95}, inputs, equation_ids, assumptions, validity, sources}.
- Models train only on verified rows; never fit on split=="test".
- Partial gravity = bounded estimate, never "measured". External data labelled "outside PSI".
- AI answers only from tool outputs; lib/ai/guard.ts rejects numbers not present in tool output.
- UI: dark theme, accent #FF6B35, colorblind-safe (burn ● / extinct ✕), KaTeX equations, Plotly science plots.
- Before saying done: `make test` and `pnpm -C web test && pnpm -C web build` pass.
- Time-box discipline: over budget by 50% → simpler fallback, note in STATUS.md, move on.
Commands: make data | make fit | make validate | make vectors | make test | make all | pnpm -C web dev

## Design rules (UI phase)
- Tokens only (web/styles/tokens.css): dark default, warm-ivory light/print theme. No raw hex in components except chart data colours from web/lib/ui/palette.ts (Okabe–Ito per investigation/fuel).
- Accent #FF6B35 ONLY on: the mission marker, the primary action (btn-accent), live flame imagery. Never on chrome, numbers or links.
- 1 px borders; shadows only on floating overlays (popovers, drawers, palette). Square data panels; radius 6 px controls, 8 px cards.
- One dominant element per screen (Console: verdict sentence). Hierarchy by size/weight; type scale 12/13/14/16/20/24/32/48/64.
- Numbers: JetBrains Mono tabular; display rounding via web/lib/ui/format.ts (2 s.f. if band > ±20 %, else 3; max 4); ranges as "(a–b)".
- Every result number is a button that opens the receipt drawer (data-receipt). Status via statusOf(): Validated / Extrapolation / Theory-only (dashed) / No data (∅).
- Motion: springs from web/lib/ui/motion.ts; animate transform/opacity only; respect prefers-reduced-motion.
- Never soften caveats, failures, "uncalibrated" states or citations. No guided tours, no fake data.
