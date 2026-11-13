# Decisions

Newest first. One entry per non-obvious choice: the decision, why, and when to revisit, in a few lines. What was built and how it was checked go in the commit message. Open questions and next steps: [backlog.md](backlog.md).

## 2026-11-13: The DAL: API Ninjas' ids as keys, its values as they come

- **API Ninjas is the provider**, as decided (its basketball endpoints, the requests in the Postman collection). Four tables from its four endpoints: `teams`, `players`, `games`, `standings`; their columns are its fields, checked against its real responses (`schema.spec.ts`'s fixtures).
- **The provider's ids are the primary keys** (`nba-por`, `nba-20261111-bos-tor`), not a uuid plus an `external_id`: the fetcher writes foreign keys straight from a response (a player's `team.team_id`), with no lookup, and every write is one `upsert` on the key. Revisit if a second provider joins: then our own ids and a mapping table.
- **Its enum values and texts are stored as they come** (`'final'`, `'regular'`, records `5-1`, streak `W7`): no mapping code to keep in step. The enums are Postgres enums, so an undocumented status fails the write instead of passing through. Text where the values aren't documented (`decided_in`, `position`, `roster_status`) or are fixed words (`conference`, `division`).
- **Left out:** `league` and `sport` (always NBA), `season_label` (from `season`), centimeters and kilograms (from inches and pounds), the provider's `updated_at`. Add any of them when something reads it.
- **Postgres in tests**, as the starting conventions said: a `nba_test` database in the same container, which `schema.spec.ts` rebuilds through the migrations and checks for drift (TypeORM's schema builder: the SQL a migration would still need).

## 2026-11-13: The starting conventions

- **outly's structure, as asked:** Nx + pnpm, NestJS 11 for both servers, React + Vite + MUI + React Query for the web, a lib per table (`sql-*`, DAL service the only data API), a lib per dtos file, a lib per controller, a lib per page. It keeps `nx affected` small and the layout familiar.
- **Postgres everywhere, no SQLite:** outly's local SQLite cost a dual-dialect layer (`DbAwareColumn`), a PK workaround for `events`, and migrations that pass on SQLite and fail on Postgres (its backlog asks to drop it). Tests run on the local Docker Postgres. Revisit if the test run gets slow: a database per Jest worker, or Testcontainers.
- **data-fetcher is a run-and-exit job, not a long-running scheduler** (`@nestjs/schedule`): the schedule lives in Cloud Scheduler / Cloud Run Jobs (and a manual `nx run` locally), so a crash can't leave a stuck timer, and overlapping runs are safe because every write is an upsert on the provider's id. Revisit if live scores need sub-minute updates (then a small polling loop while games are live).
- **Only frontend-api runs migrations;** the fetcher refuses to run while any are pending. One owner, so two apps booting at once never race on the schema.
- **The API never writes NBA data**, only users' data (predictions). One writer per table keeps the sync's upserts the truth.
- **English only, no RTL:** outly's Hebrew doubled every text and test. The SCSS still uses logical properties, so adding a language later is copy, not layout.
- **Import alias `@nba/<name>`** (shorter than the repo name).
- **Kept lean on purpose:** no auth, storage, emails, audit log or cache lib until a feature needs one (see the backlog's questions).
