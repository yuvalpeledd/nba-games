# Decisions

Newest first. One entry per non-obvious choice: the decision, why, and when to revisit, in a few lines. What was built and how it was checked go in the commit message. Open questions and next steps: [backlog.md](backlog.md).

## 2026-11-13: The fetchers' requests in parallel, with pMap

- **pMap instead of a loop of awaits**, as asked: the rosters (30) and the games' days, `FETCH_CONCURRENCY` at a time (default 5). A cap, not everything at once: the provider's limits are per hour, but a burst of 50 is what it's likeliest to refuse, and the database writes come at the same pace.
- **`p-map` 4**, not 7: from 5 it's ES modules only, which Jest's CommonJS can't load without a transform (outly's `jest.preset.js` has one for others). Same API; move up if Jest or the libs go ESM.
- **What stays as it was:** the days start nearest to today first (pMap starts items in order), a roster's failure still writes nothing (pMap rejects on the first), and a 429 still stops the pool: the days in flight finish, no new one starts. What changes: per-item log lines come in the order items finish.

## 2026-11-13: A team's page reads its season with `GET /games?season=&teamId=`

- **`season` instead of `from`/`to`, only with `teamId`,** not paged: a team plays ~100 games a season (preseason and playoffs included), while the date range stays capped at 31 days for the league-wide schedule. Chosen over the web asking month by month (9 requests, and guessing where the playoffs end). Revisit if a season ever needs paging or a league-wide season list.

## 2026-11-13: The web-app

- **On `frontend-api`'s contracts:** the standings page asks `/seasons` for the current season (the newest that has started, else the newest) and joins `/standings?season=` with `/teams` for the names; the teams page lists the active teams (`/teams` has past franchises too). The specs run on a fake API with the same routes.
- **outly's design system, copied, not shared:** its palette (`colors.scss`, without the order-status, semantic and gradient maps), `theme.tsx` without RTL, locales and date pickers, and its MUI overrides (all but rich text). No package spans the two repos; revisit if both keep changing it.
- **The navbar and page layout live in the shell lib,** not a `layout` lib as in outly: every page has the same one, and `AppShell` renders it as the routes' layout. Split it out when a page needs a different frame (a full-screen login).
- **Games behind are computed on the web, from the conference's leader:** the provider's `games_behind` is from the division's, which reads wrong in a conference table. Move it into the API's `StandingDto` if another client needs it.
- **Left out of outly's shell for now:** toasts (no mutations), the error boundary and error page, scroll-to-top, table paging (30 rows at most). Add each with the first page that needs it.

## 2026-11-13: The fetchers' logs count every write

- **Counted by Postgres, in the write itself** (`upsertCounted` in `@nba/sql-core`), as asked ("x fetched, a added, b updated, c deleted"): `ON CONFLICT DO UPDATE … WHERE` a value is distinct (TypeORM's `skipUpdateIfNoValuesChanged`), `RETURNING (xmax = 0)` (true for an inserted row). Unchanged is what came back unwritten. No read before the write, and an unchanged row's `updated_at` stays, so it now means "changed". Revisit if Postgres's `xmax` behavior changes (it's an implementation detail, stable for decades).
- **`team_players`' day is diffed, not replaced:** the rows today's fetch no longer has are deleted and only the new ones inserted, so "deleted" counts real departures (a rerun the same day deletes 0, not 510).
- **Deletes appear only where the fetchers delete** (a day's `team_players`), with released players (`team_id` null) beside them; teams, games and standings are never deleted, so their lines say added, updated and unchanged.

## 2026-11-13: `game_days`: the days the games fetcher checked

- **A row per day fetched, empty days included** (its game count and `checked_on`), so a day without games is asked for once instead of every run. Chosen over a placeholder row in `games` (it would break its NOT NULLs and foreign keys for every reader), a list of off-days on `seasons` (by hand, wrong when the league reschedules) and inferring from `games` (an empty day looks like one never fetched). It also replaces "a day with no games" as the pool's test for the schedule: never checked is the test now.
- **`checked_on` is a league day, not a timestamp:** an empty day is final only when checked on or after it, so a day checked before its schedule was out (playoffs, the NBA Cup's knockouts) is asked for again on its day; and a day string compares and tests without a clock. Its migration fills it from the games already stored, so a database that has them doesn't fetch the season again.
- **Revisit** to refresh future days with games not checked in a while (postponements), from `checked_on`.

## 2026-11-13: frontend-api's reads

- **Read-only routes, no auth yet**, as asked: `GET /api/seasons`, `/teams`, `/teams/:id`, `/players?teamId=&limit=&offset=`, `/players/:id`, `/players/:id/teams`, `/games?from=&to=&teamId=`, `/games/:id`, `/standings?season=`. Revisit with the backlog's "who uses it?".
- **Games by a range of league days, at most 31** (`MAX_GAME_DAYS`), not paged: a month's schedule is ~230 games. `to` defaults to `from` (one day).
- **Games carry team ids, not teams:** the web loads `/teams` once (30 rows) and joins. Revisit if a page needs one game without the teams list.
- **`/players/:id/teams` gives one span per team** (first to last day seen), so a player who leaves and returns shows one span across the gap. Split on gaps if a "traded on" view needs it.
- **`SeasonDto.year`** (from `start_date`) is what `/standings?season=` and `games.season` take, so the web never parses `nba-2026-27`.

## 2026-11-13: `standings_history`, and the games' scores from the last scored day

- **A row per day, season and team**, as asked, with the same columns as `standings` (an abstract `StandingColumns` both extend, so the two can't drift; `standings`' table is unchanged). It points at `standings` (season and team), so `recordStandings` writes both in one transaction from its lib, as the sql libs' rule has it. A second fetch the same day overwrites the day's row. Revisit (a row only when something changed) if ~5,000 rows a season ever matters.
- **The games' scores come from the last day with a scored game to today**, as asked, replacing the "a played day until all its games are over" rule (the entry below): one `MAX(date)` instead of a status per day, and the last scored day is fetched again too, for its late games. With no scored game yet, from the season's start. The days with no games are still fetched, for the schedule. Revisit if a game left unscored on an earlier day (a suspended one) needs its score: this rule never goes back for it.

## 2026-11-13: The data-fetcher: four fetchers, a task pool for the games

- **Every run runs every fetcher**, in order (teams, players, standings, games), as asked, rather than jobs picked by argument (the earlier plan): 32 calls plus the games' cap fits the free plan's hour. Revisit when one needs its own schedule (`--job` then).
- **"Delete" is a release and a replacement**, not a deleted row: a player on no roster gets `team_id` null, and today's `team_players` are replaced by the run's fetch (so a day holds its last fetch, not both teams of a trade day, as the `team_players` entry below first had it). Players and teams stay: `team_players`, games and standings point at them. The players fetcher writes nothing unless all 30 rosters came back, since a missing one would release a whole team.
- **The games' task pool is rebuilt from the table each run** (the days whose games aren't there or aren't over), with no queue of its own: a crash or a quota loses nothing, and a rerun picks up where it stopped. Nearest to today first, so a capped run brings what's current before the backfill. "Has its data" counts a played day's results, not just its rows, or its scores would never come.
- **No yup on the provider's responses** (the earlier plan): the tables' NOT NULLs, enums and foreign keys already refuse a missing or unknown value, and the response types are checked against real responses. Revisit if a nullable field arrives null when it shouldn't.
- **No retries:** every fetch is redone by the next run. **No bundle yet:** the app runs from its sources (ts-node), like the migrations CLI; webpack and a Cloud Run Job come with deployment.
- **The specs share `nba_test`**, so Nx runs test targets one at a time (`parallelism: false`): simpler than a database per project, while the suite takes seconds.

## 2026-11-13: `seasons`, loaded by migrations

- **A table of seasons with their dates**, as asked, loaded by a data migration per season (2026-27: 2026-10-20 to 2027-04-11), apart from the table's own migration, so a season's dates are reviewed like code and every database gets the same rows. The provider has no seasons endpoint.
- **Not linked to `games` and `standings` yet:** their `season` is the provider's year (2026), and `seasons.id` is `nba-2026-27`. Revisit with the first query that joins them (a foreign key then, or `seasons.year`).
- **Its dates are the regular season's:** the play-in and playoffs run past `end_date`, so a playoff day's `findByDate` is null. Revisit if the playoffs need their season (an `end_date` through the Finals, or a column for it).

## 2026-11-13: Rosters by day: `team_players`

- **A row per day, team and player** (all three the key), as asked, from the daily roster fetch, rather than stints (`from` / `to` per team): a daily insert with no reads before it, idempotent, and a trade on any day is caught whatever the provider says about when it happened. A player on two teams the same day (a trade between fetches) is two rows, so the team is in the key.
- **Size:** about 500 rows a day, ~120,000 a season: fine for Postgres. Revisit (stints computed from the days, or kept beside them) if reading a player's teams over seasons gets slow, or for a "traded on" view.
- **`players.team_id` stays** as today's team: the common read needs no `MAX(date)`.

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
