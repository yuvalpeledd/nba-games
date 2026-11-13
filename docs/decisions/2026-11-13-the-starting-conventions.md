# The starting conventions

2026-11-13

- **outly's structure, as asked:** Nx + pnpm, NestJS 11 for both servers, React + Vite + MUI + React Query for the web, a lib per table (`sql-*`, DAL service the only data API), a lib per dtos file, a lib per controller, a lib per page.
  It keeps `nx affected` small and the layout familiar.
- **Postgres everywhere, no SQLite:** outly's local SQLite cost a dual-dialect layer (`DbAwareColumn`), a PK workaround for `events`, and migrations that pass on SQLite and fail on Postgres (its backlog asks to drop it).
  Tests run on the local Docker Postgres.
  Revisit if the test run gets slow: a database per Jest worker, or Testcontainers.
- **data-fetcher is a run-and-exit job, not a long-running scheduler** (`@nestjs/schedule`): the schedule lives in Cloud Scheduler / Cloud Run Jobs (and a manual `nx run` locally), so a crash can't leave a stuck timer, and overlapping runs are safe because every write is an upsert on the provider's id.
  Revisit if live scores need sub-minute updates (then a small polling loop while games are live).
- **Only frontend-api runs migrations;** the fetcher refuses to run while any are pending.
  One owner, so two apps booting at once never race on the schema.
- **The API never writes NBA data**, only users' data (predictions).
  One writer per table keeps the sync's upserts the truth.
- **English only, no RTL:** outly's Hebrew doubled every text and test.
  The SCSS still uses logical properties, so adding a language later is copy, not layout.
- **Import alias `@nba/<name>`** (shorter than the repo name).
- **Kept lean on purpose:** no auth, storage, emails, audit log or cache lib until a feature needs one (see the backlog's questions).
