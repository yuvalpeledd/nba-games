# frontend-api's reads

2026-11-13

- **Read-only routes, no auth yet**, as asked: `GET /api/seasons`, `/teams`, `/teams/:id`, `/players?teamId=&limit=&offset=`, `/players/:id`, `/players/:id/teams`, `/games?from=&to=&teamId=`, `/games/:id`, `/standings?season=`.
  Revisit with the backlog's "who uses it?".
- **Games by a range of league days, at most 31** (`MAX_GAME_DAYS`), not paged: a month's schedule is ~230 games.
  `to` defaults to `from` (one day).
- **Games carry team ids, not teams:** the web loads `/teams` once (30 rows) and joins.
  Revisit if a page needs one game without the teams list.
- **`/players/:id/teams` gives one span per team** (first to last day seen), so a player who leaves and returns shows one span across the gap.
  Split on gaps if a "traded on" view needs it.
- **`SeasonDto.year`** (from `start_date`) is what `/standings?season=` and `games.season` take, so the web never parses `nba-2026-27`.
