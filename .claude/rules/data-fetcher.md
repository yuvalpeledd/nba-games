---
paths:
  - 'apps/data-fetcher/**'
  - 'libs/data-fetcher/**'
---

# Data fetcher

For `apps/data-fetcher` and `libs/data-fetcher`. The tables it writes are in CLAUDE.md's Server conventions; what the data means is in `features.md`.

- **One run, then exit:** `main.ts` boots a Nest standalone context (`NestFactory.createApplicationContext`, no HTTP), runs the jobs it was asked for, closes the context and exits non-zero if any job failed. The schedule lives outside the code (Cloud Scheduler → Cloud Run Job in production, `pnpm nx run data-fetcher:run` locally), so a crashed run never leaves a stuck process and two runs never share memory.
- **The provider is API Ninjas** (`https://api.api-ninjas.com/v1`, the key in the `X-Api-Key` header), always with `league=nba`. The Postman collection's requests, one per table:
  - `basketballteams` → `teams` (every team in one call)
  - `basketballplayers?team=<team id>` → `players` (a call per team: 30; paged with `limit` / `offset`)
  - `basketballgames?date=<YYYY-MM-DD>` → `games` (a US Eastern day; also `season`, `team`, `status`, `game_id`; paged)
  - `basketballstandings?season=<year>` → `standings` (the collection's "Get Standings" calls `basketballteams` by mistake)
- **Jobs by argument:** `--job=<name>` (repeatable; none = the default set). Each job is one `@Injectable()` with `run(): Promise<void>` in its lib: `teams` (weekly), `players` (daily: rosters refresh daily; it also records the day's rosters in `team_players`), `games` (today and yesterday, after games end; the season's schedule weekly), `standings` (daily).
- **The quota decides the schedule:** the free plan is 3,000 calls a month and 100 an hour, with the current season only and no live scores. A day of `players` is 30 calls (900 a month): count a job's calls before scheduling it. A refused call (429) stops the job and logs it; the next run continues. Retry only 5xx, with `@Retry()`.
- **Idempotent upserts:** NBA tables are keyed by the provider's ids (CLAUDE.md's Server conventions), and every write is an upsert on the key. Rerunning a job, or two overlapping runs, change nothing. Never delete NBA data because a response omitted it; log a warning instead.
- **The provider's client is the only code that knows its shape:** `libs/data-fetcher/api-ninjas-client` maps its JSON to our create objects (as `schema.spec.ts`'s mappers do today: move them there) and validates it with yup, so a format change fails loudly, with the field, instead of writing nulls. **A key can be missing instead of null** (`college` for players who didn't go to college): map a missing key to null. The jobs see only our types.
- **Migrations:** the fetcher runs none. At boot it checks for pending ones (`dataSource.showMigrations()`) and exits with an error if there are any.
- **Logs:** one line per job when it's done: what it fetched and how many rows it inserted, updated and left unchanged, and how long it took. A failing job logs its error with `stackOf(error)` and the others still run.
- **Tests:** each job's spec feeds recorded responses (`__fixtures__/*.json`, real payloads trimmed to a few rows) through a faked client, against the test DB, and runs it twice to check idempotency. Never call the real provider from a test.
- Env: `API_NINJAS_KEY` (required: the run fails at boot without it), plus the `DB_*` from CLAUDE.md's Database. Never commit the key or log it; the Postman collection holds one, so keep it out of the repo.
