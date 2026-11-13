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

How each feature works on the server: its rules, invariants and edge cases. Add a section per feature as it is built; delete what turns out wrong.

- **The NBA data** (a table lib each, the provider's ids as keys, see CLAUDE.md's Server conventions): `teams` (30 active, plus past franchises with `active` false), `players` (on their current team, `team_id`), `games` (home, away and winning team, start, status, scores and per-period scores) and `standings` (a row per team per season). The provider has **no box scores or player stats**: per-player numbers need another source (`docs/backlog.md`).
- **Seasons** are the year they start in (`season` 2026 is `2026-27`, as the provider counts them); show them as `2026-27`. A game has a `season_type` (`preseason`, `regular`, `cup_final`, `play_in`, `conference_tournament`, `postseason`); stats and standings default to `regular`.
- **Game times:** `start_time` is a UTC `timestamptz`; `date` is the day the league lists the game on, in US Eastern time (a 7 PM ET game starts the next day in UTC). Schedules and "today's games" go by `date`; the web shows `start_time` in the viewer's time zone.
- **Game status:** `scheduled`, `in_progress`, `final`, `postponed`, `canceled`, `suspended`, `delayed`. Scores, `period_scores` and `winner_team_id` are null until it starts (and `winner_team_id` until it's `final`). A postponed game keeps its id (its first date is in it and in `original_date`) and gets a new `date` and `start_time`. Live scores (`period`, `clock`) need a paid plan: on the free one a game goes from `scheduled` to `final`.
- **Standings** come from the provider as they are, ranks included (`conference_rank` is the playoff seed); `final` marks a finished season's. Records (`5-1`) and the streak (`W7`) are kept as its text.
- **Predictions:** see `docs/backlog.md` for the open questions (who predicts, and what). Whatever the answer, these hold:
  - A prediction locks when its game starts (`start_time`), checked on the server: a write after that is 409 `PREDICTION_LOCKED`, whatever the web shows.
  - Scoring is a plain function in the predictions dtos lib (`scorePrediction(prediction, game)`), run by the API when reading and covered by its own spec; scores are derived, never stored, until that gets slow.
  - A game that ends without a result (`canceled`) voids its predictions instead of scoring them.
