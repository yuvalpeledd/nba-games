# A test database per Nx project, tests in parallel

2026-11-14

- **Each test project gets its own database** (`nba_test_<checkout>_<project>`, from `NX_TASK_TARGET_PROJECT`), so Nx runs test targets in parallel like every other target (`"parallel": 8`), as outly does.
  This replaces the shared per-checkout database and `parallelism: false` from [the four fetchers](2026-11-13-the-data-fetcher-four-fetchers-a-task-pool-for-the-games.md) and [docs and tests for parallel agents](2026-11-13-docs-and-tests-for-parallel-agents.md).
- **Postgres stays** rather than outly's in-memory SQLite: the specs run the real migrations, and `schema.spec.ts` checks them for drift.
- The cost: each project rebuilds its own schema through the migrations, and a checkout leaves one database per test project behind.
- Revisit if the migrations get slow enough that rebuilding them per project costs more than parallelism saves.
