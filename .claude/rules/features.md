---
paths:
  - 'apps/frontend-api/**'
  - 'apps/data-fetcher/**'
  - 'apps/score-manager/**'
  - 'libs/frontend-api/**'
  - 'libs/data-fetcher/**'
  - 'libs/score-manager/**'
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
    `GET /me` answers the caller's user, and `PATCH /me` renames them (the only field a user changes through the API; the password is Firebase's).
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
  - A prediction opens `PREDICTION_WINDOW_DAYS` (10) before its game's `start_time` (`isPredictionTooEarly`): a write before that is 409 `PREDICTION_NOT_OPEN`, and the web shows the pick disabled.
  - Scoring is a plain function in the predictions dtos lib (`scorePrediction(prediction, game)`: right, wrong, or null until the game is final with a winner), covered by its own spec, run by the web and by score-manager (see Scores).
    The web runs it: the dashboard's Predictions counts the current season's games and the caller's picks (`GET /games?season=`, `GET /predictions?season=`).
  - A game that ends without a result (`canceled`) voids its predictions instead of scoring them.
- **Groups** (`groups`: uuid, `name` up to 100, `owner_id`, `public`, `status` `Active`, `Closed` or `Deleted`, `deleted_at`; `group_members`: uuid, `group_id`, `user_id`, unique on both): users who play together.
  `POST /groups` (`{ name, public }`) makes an `Active` group the caller owns, with the caller as its first member, in one transaction (`GroupMemberDalService.createGroup`: the write spans both tables, so it's in the lower one's DAL).
  `GET /groups` answers what the caller may see: every public group, and the private ones they're in, by name, each with its owner, member count and `isMember` (the web splits them into the caller's and the public ones they're not in).
  `GET /groups/:id` (a uuid, else 400) answers one with its members by name, each with their `score` in it (the sum of their `group_user_score` rows there; the web's scoreboard), and its `gameScores` (see Game scores); a private group the caller isn't in is 404, like a missing one, so an id gives nothing away.
  `GET /groups/:id/games/:gameId/predictions` answers each member's pick of a game, by name (`picked`, and `pick`), only to its members: 403 for a public group the caller isn't in, 404 for a group they may not see or an unknown game.
  Until the game locks (`isPredictionLocked`) `pick` is null for everyone: only who picked shows, so no one copies another's pick.
  Its owner edits it (`PATCH /groups/:id`, `{ name, public }`, answering the group) and deletes it (`DELETE /groups/:id`, 204); anyone else who sees it is 403, and one they don't see is 404.
  A delete is soft: `status` `Deleted` and `deleted_at` (a `@DeleteDateColumn`, so TypeORM leaves the row out of every read): a deleted group is 404 everywhere and never listed.
  `POST /groups/:id/members` joins a group the caller sees (answering the group; already a member, a no-op), then asks score-manager to score their past picks there (`POST $SCORE_MANAGER_URL/api/groups/:groupId/users/:userId/score`, with a timeout), so they count from the start.
  If score-manager fails, the join is undone and it's 503: no member is missing scores.
  `DELETE /groups/:id/members/me` (204) leaves one; its owner can't (409: they delete it instead), and leaving a private group can't be undone (nothing invites yet).
  A leaver's scores stay, unseen (the scoreboard lists members), and joining again scores them anew.
  Nothing closes a group yet.
- **Game scores** (`group_game_score`: uuid, `group_id`, `game_id`, `score` int, unique on both): what a right pick of a game scores in a group, `DEFAULT_GAME_SCORE` (1, `@nba/dtos-groups`) unless its owner set another, so only the set ones have a row.
  `PUT /groups/:id/games/:gameId/score` (`{ score }`, an integer from 0 to 100) makes or replaces one, answering `{ gameId, score }`: anyone but the owner is 403 (404 for a group they don't see), an unknown game 404.
  A game's score is set only until it's completed (`isGameCompleted`: `final` or `canceled`), checked on the server: after that it's 409 `GAME_COMPLETED`, so a scored game's points never change under it.
  The web shows each game's score in the group page's games table, and the owner sets it from a row's menu.
- **Scores** (`group_user_score`: uuid, `group_id`, `user_id`, `game_id`, `score` int, unique on the three): what a member's prediction of a game scored in a group: the game's score there (see Game scores) if right, 0 if wrong.
  `score-manager`'s internal `POST /api/groups/:groupId/users/:userId/score` scores a member's every pick of a final game in that group (404 for a user not in it), called by frontend-api when they join.
  Its `POST /api/games/:gameId/score` writes them, called by the games fetcher for every known game a run turned final (see `data-fetcher.md`): every prediction of the game with a pick, scored by `scorePrediction`, a row in each group its user is in.
  A taken-back pick (null) and a user in no group get no row; scoring a game again overwrites its rows (a corrected result).
  An unknown game is 404; a game not final with a winner (a canceled one never is: its picks are void) is 409 `GAME_NOT_FINAL`, and nothing is written.
  `POST /api/games/score?from=&to=` (days, both included, both required) scores every game in the range that's final with a winner the same way and skips the rest, answering a `{ gameId, scores, right }` per game scored: to rescore by hand.
  The route has no auth: score-manager must never be reachable from outside the deployment.
