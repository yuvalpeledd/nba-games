---
paths:
  - 'apps/data-fetcher/**'
  - 'libs/data-fetcher/**'
---

# Data fetcher

For `apps/data-fetcher` and `libs/data-fetcher`.
The tables it writes are in CLAUDE.md's Server conventions; what the data means is in `features.md`.

- **One run, then exit:** `apps/data-fetcher/src/main.ts` boots a Nest standalone context (no HTTP), refuses to go on while migrations are pending (only frontend-api migrates), runs a scan (`ScanService`: every fetcher in order, `teams` → `players` → `standings` → `games`, since the players and the games need the teams), closes and exits 1 if any failed.
  A failed fetcher doesn't stop the ones after it.
- **Every scan is recorded** in `scans` (`@nba/sql-scans`), a row when it ends, failed ones too: its start and end, `success`, the rows it added, updated and left unchanged, and the failed fetchers' errors.
  Each fetcher's `run()` returns its `WriteCounts` of the NBA tables only (teams, players, standings, games; not `team_players` or `standings_history`), and the scan sums those that succeeded.
  A run stopped before the fetchers (pending migrations, no DB) records nothing.
  The dashboard shows the last one (`GET /scans/last`).
  The schedule lives outside the code (Cloud Scheduler → Cloud Run Job in production, `pnpm nx run data-fetcher:run` locally), so a crash never leaves a stuck process.
- **Runs from its sources** (`node -r ts-node/register`, `.env` loaded with `--env-file-if-exists`): no bundle until it's deployed (`docs/backlog.md`).
- **The provider is API Ninjas** (`https://api.api-ninjas.com/v1`, the key in `X-Api-Key`, always `league=nba`), called only by `ApiNinjasClient` (`libs/data-fetcher/api-ninjas-client`): a method per request, its answer mapped to our create objects (`mappers.ts`), so the fetchers see only our types.
  Its response types (`api-ninjas.types.ts`) are checked against real responses (`fixtures.ts`).
  The tables' NOT NULLs, enums and foreign keys refuse what's missing or unknown; **a key can be missing instead of null** (`college`): map it to null.
  A refused call throws `ApiNinjasError` with its `status` (400 for a bad key, 429 for the quota).
  No retries: the next run redoes what failed.
- **The fetchers** (`libs/data-fetcher/fetchers`, a `*-fetcher.service.ts` each, `run()`):
  - `teams-fetcher`: `basketballteams`, one request; upserts every team.
    Teams are never deleted (everything points at them).
  - `players-fetcher`: `basketballplayers?team=<id>`, one request per active team (30), `FETCH_CONCURRENCY` at a time (pMap; its results keep the teams' order), then all in one transaction (`TeamPlayerDalService.replaceRosters`): the players upserted on their teams, anyone else on a team released (`team_id` null; players are never deleted, their days stay), and today's `team_players` made what this run saw (the rows it no longer has deleted, its new ones inserted).
    Writes nothing unless every roster came back non-empty (a missing one would release its team).
  - `standings-fetcher`: `basketballstandings`, one request, the current season's, in one transaction (`StandingHistoryDalService.recordStandings`): `standings` upserted to the latest, and today's row per team upserted in `standings_history` (a second run that day updates it).
  - `games-fetcher`: the task pool, over the season (`SEASON_ID`, default: the newest in `seasons`).
    Its days: **the days never checked** (no row in `game_days`), the schedule, and **the scores to update**, every day from the last one with a scored game (`GameDalService.lastScoredDate`; the season's start if none) to today, but a day already found empty on or after it (Thanksgiving, the All-Star break: `games` 0, `checked_on` ≥ the day).
    A day found empty before it came is checked again on its day, in case its schedule came since.
    Started nearest to today first, one request per day (`basketballgames?date=`), `FETCH_CONCURRENCY` at a time (pMap), up to `GAMES_MAX_REQUESTS` (default 50); every day fetched is recorded in `game_days` (`GameDayDalService.record`: its count and `checked_on`, today), empty ones too, and the next run picks up the rest.
    A failed day isn't recorded, so it's retried.
    A 429 starts no more days (those in flight finish) without failing the run; another failure skips the day and fails the run at the end.
    **Scoring:** a game the day's fetch made final with a winner (or whose final score or winner changed), and that was known before it, is sent to score-manager (`POST $SCORE_MANAGER_URL/api/games/:gameId/score`, with a timeout), which scores its predictions.
    A game first seen final has no predictions to score (a prediction needs its row).
    A refused call is logged and fails the run at the end; the next run doesn't retry it (the game is unchanged by then).
- **Parallel with pMap** (`p-map` 4: 5+ are ES modules only, which Jest's CommonJS can't load), never a loop of awaits: `FETCH_CONCURRENCY` requests in flight (default 5, `concurrency.ts`).
  A mapper that must not stop the others (a games day) catches its own errors; one whose failure must stop everything (a roster) throws, and pMap rejects.
  Per-item log lines come in the order items finish: specs compare them as a set.
- **"Today"** is the league's day, US Eastern (`easternDate()` in `days.ts`), for `team_players.date` and the games' days.
  Fetchers take it as `run(today)`, so specs pass their own.
- **The quota decides the schedule:** the free plan is 3,000 calls a month and 100 an hour, the current season only, no live scores.
  A run is 32 calls (1 + 30 + 1) plus up to `GAMES_MAX_REQUESTS`: keep the sum under 100 an hour, and daily runs under 3,000 a month.
  Once the season is checked, a daily run's games are a few requests (the last scored day to today).
- **Logs:** every write is counted (CLAUDE.md's Server conventions), and a fetcher says what it fetched and what that did, in one wording (`describeWrites` in `counts.ts`): `Fetched 30 teams from the API: 0 added, 2 updated, 28 unchanged`.
  - players: a line per roster (`Fetched 17 players of nba-por from the API`), then the players (`…, 2 released (on no roster now)`) and the day's rosters (`Rosters of <day> (team_players): 5 added, 3 deleted, 507 unchanged`);
  - standings: both tables (`…; history of <day>: 30 added, 0 updated, 0 unchanged`);
  - games: first the pool and the days it checks now (`<season>, today <day>: 174 days to check (170 never checked, 4 for scores from <day>); checking 50 now (up to 50 a run): <days>`), then a line per day (`<day>: fetched 10 games from the API: 0 added, 10 updated, 0 unchanged`, or `fetched no games`, and `<day>: scored 3 of 3 games that turned final (score-manager)`), then the run's (`checked 50 of 174 days (0 failed, 124 left for the next run); games …`).
  - And per fetcher `<name> done in <ms>`.
    A failure is an error line with its stack.
    Never the key.
    The specs check the lines (`logged()` in `fetchers.spec.ts`): change them together.
- **Tests** (`fetchers.spec.ts`): the real client and fetchers against the test DB, with only `fetch` faked, answering with `fixtures.ts`'s real responses (`answerWith(url => ...)`); a test changes the answers to make a trade, a quota or a failure.
  The client's own spec checks the requests and the mapping.
  Never call the real provider from a test.
- Env: `API_NINJAS_KEY` (required: the run fails at boot without it; put it in `.env`, see `.env.example`), `SEASON_ID`, `GAMES_MAX_REQUESTS`, `FETCH_CONCURRENCY`, `SCORE_MANAGER_URL` (default `http://localhost:3001`: run score-manager beside a local run, or games that turn final fail it), plus the `DB_*` from CLAUDE.md's Database.
  Never commit the key or log it; the Postman collection holds one, so keep it out of the repo.
