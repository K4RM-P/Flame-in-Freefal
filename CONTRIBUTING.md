# Contributing to EmberAtlas

1. Read `CLAUDE.md` (project rules) and `docs/PRD.md` (spec). The Python package `physics/emberphys` is the science source of truth; TypeScript ports must match `shared/golden_vectors.json`.
2. Never hard-code a property, constant or data value: put it in `physics/data/*.yaml` with its source. Unknown values are `TODO_VERIFY` plus an entry in `docs/HUMAN_TASKS.md`.
3. No fake or demo data. Every number shown must come from the engine or from NASA data in the repo.
4. New source files start with the `SI-assisted` header; new libraries go in `physics/data/software.yaml` with their licence, then `make export`.
5. Before opening a pull request: `make test` and `pnpm -C web lint && pnpm -C web typecheck && pnpm -C web test && pnpm -C web build`.
