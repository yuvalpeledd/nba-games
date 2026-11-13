---
paths:
  - 'apps/frontend-api/**'
  - 'apps/data-fetcher/**'
  - 'libs/frontend-api/**'
  - 'libs/data-fetcher/**'
  - 'libs/sql/**'
  - 'libs/dtos/**'
  - 'libs/enums/**'
---

# Features

How each feature works on the server: its rules, invariants and edge cases.
Add a section per feature as it is built; delete what turns out wrong.

- **The NBA data** (a table lib each, the provider's ids as keys, see CLAUDE.md's Server conventions): `teams` (30 active, plus past franchises with `active` false), `players` (on their current team, `team_id`), `team_players` (who was on which team, a row per day, team and player: see Rosters), `games` (home, away and winning team, start, status, scores and per-period scores) and `standings` (a row per team per season).
  The provider has **no box scores or player stats**: per-player numbers need another source (`docs/backlog.md`).
- **Seasons** (`seasons`: `id` `nba-2026-27`, `name` `NBA 2026-2027`, the regular season's `start_date` and `end_date`) are loaded by a migration each, since the provider has no endpoint for them: **a new season needs its migration** (`migrations/*-load-season-<years>.ts`, an `INSERT` and its `DELETE`) before the fetcher reaches it.
  `SeasonDalService.findByDate` gives the season a day falls in (null between seasons).
  The provider's rows (`games.season`, `standings.season`) carry the year it starts in (2026 is `2026-27`), not a `seasons.id`; show them as `2026-27`.
  A game has a `season_type` (`preseason`, `regular`, `cup_final`, `play_in`, `conference_tournament`, `postseason`); stats and standings default to `regular`.
- **Game times:** `start_time` is a UTC `timestamptz`; `date` is the day the league lists the game on, in US Eastern time (a 7 PM ET game starts the next day in UTC).
  Schedules and "today's games" go by `date`; the web shows `start_time` in the viewer's time zone.
- **Game status:** `scheduled`, `in_progress`, `final`, `postponed`, `canceled`, `suspended`, `delayed`.
  Scores, `period_scores` and `winner_team_id` are null until it starts (and `winner_team_id` until it's `final`).
  A postponed game keeps its id (its first date is in it and in `original_date`) and gets a new `date` and `start_time`.
  Live scores (`period`, `clock`) need a paid plan: on the free one a game goes from `scheduled` to `final`.
- **Rosters** (`team_players`, keyed by `date`, `team_id` and `player_id`): each day's `players` job records every rostered player on their team for that day (the league's day, US Eastern), so a trade mid-season shows as the player's days moving from one team to the next.
  `players.team_id` is only the latest.
  A day the job didn't run has no rows: read a gap as unknown, not as off the roster.
  A second run the same day replaces that day's rows, so a day holds what its last fetch saw; earlier days are never deleted.
  A player on no roster keeps their row with `team_id` null.
- **Standings** come from the provider as they are, ranks included (`conference_rank` is the playoff seed); `final` marks a finished season's.
  Records (`5-1`) and the streak (`W7`) are kept as its text.
  `standings` holds the latest (a row per season and team); **`standings_history`** holds each day's (a row per day, season and team, the same columns: `StandingColumns`), written together by the standings fetcher, so a team's climb can be read back (`findByTeam`) or a day's table (`findByDate`).
  A day the fetcher didn't run has no rows; a second run that day overwrites its rows.
- **Auth** (outly's, without organizations, roles, invitations or the audit log): Firebase (Identity Platform) signs people in with email and password; the API never sees a password.
  The web sends the account's ID token: in the body of `POST /login` and `POST /sign-up`, then as `Authorization: Bearer` on every other route.
  Everything is for signed-in users: `AccessGuard` is global, and only `/login`, `/sign-up`, `/firebase-config` and `/health` are `@Public()`.
  - `users` (uuid, `name`, `email` lower-cased and unique, `firebase_uid` unique): a row per Firebase account, made by `/sign-up` with a name.
    `/login` answers the account's user, 404 when it has none yet (the web asks for a name, then signs up).
  - Every account's email is verified first: an unverified one is 403 `EMAIL_NOT_VERIFIED` on every route.
    An email another account's user has is 409 `USER_EXISTS` at sign-up.
    A token Firebase refuses, or an account with no user, is 401.
  - A user's email follows their account's (changed through Firebase), unless another user has it: then it stays (logged).
  - Config (`firebaseSettings`): production needs `GOOGLE_CLOUD_PROJECT`, `FIREBASE_API_KEY` and `FIREBASE_AUTH_DOMAIN`.
    Elsewhere it's the dev project, `yuval-nba-test-882ca`, whose web API key is still required (`FIREBASE_API_KEY` in `.env`): local sign-ups are real accounts there.
    `GET /firebase-config` hands the web what it needs, so one build serves every environment.
- **Predictions** (`predictions`: uuid, `user_id`, `game_id`, unique on both): a signed-in user picks a game's winner, `pick` `Home` or `Away`, null when they took it back.
  `GET /predictions?season=` answers the caller's for a season's games, `PUT /predictions/:gameId` (`{ pick }`) makes or replaces one, as the caller (`@CurrentUser()`).
  - A prediction locks when its game starts (`start_time`), or once its status is anything but `scheduled`, `postponed` or `delayed` (`isPredictionLocked` in `@nba/dtos-predictions`, which the web runs too), checked on the server: a write after that is 409 `PREDICTION_LOCKED`, whatever the web shows.
  - Scoring is a plain function in the predictions dtos lib (`scorePrediction(prediction, game)`: right, wrong, or null until the game is final with a winner), covered by its own spec; scores are derived, never stored, until that gets slow.
    The web runs it: the dashboard's Predictions counts the current season's games and the caller's picks (`GET /games?season=`, `GET /predictions?season=`).
  - A game that ends without a result (`canceled`) voids its predictions instead of scoring them.
- **Groups** (`groups`: uuid, `name` up to 100, `owner_id`, `public`, `status` `Active` or `Closed`; `group_members`: uuid, `group_id`, `user_id`, unique on both): users who play together.
  `POST /groups` (`{ name, public }`) makes an `Active` group the caller owns, with the caller as its first member, in one transaction (`GroupMemberDalService.createGroup`: the write spans both tables, so it's in the lower one's DAL).
  `GET /groups` answers what the caller may see: every public group, and the private ones they're in, by name, each with its owner and member count.
  Nothing joins, leaves or closes a group yet.
