# Group scores: stored, written by score-manager, an internal API

2026-11-14

- A pick's score is stored per group (`group_user_scores`: group, user, game, `score` 1 or 0), as asked, replacing "derived, never stored" ([predictions](2026-11-13-predictions-a-winner-pick-per-user-and-game.md)), so a group's table is a `SUM`.
  It's still `scorePrediction` that decides right or wrong, so the web's counts and the stored scores can't disagree.
- A user's pick scores in every group they're in when the game is checked: one pick, many groups, no per-group picks.
  Who made no pick (or took it back) gets no row, not a 0.
- `score-manager` is an app of its own (`POST /api/games/:gameId/check`) with no sign-in, as an internal API: nothing in it is the web's, and frontend-api's `AccessGuard` would make every call need a Firebase user.
  It runs from its sources like the data-fetcher, on `SCORE_MANAGER_PORT` (3001), with frontend-api's HTTP plumbing (`frontend-api-common`, tagged `scope:server` for it).
- Revisit when it's deployed (keep it off the public network, or give it a service token) and when something must call it: the data-fetcher after a game turns final, or a schedule.
  A user who joins a group later has no scores there for games checked before: re-check them, or backfill on join.
