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
