# `scans`: a row per data-fetcher run

2026-11-13

- **A table, not the logs:** the dashboard says when the data was last fetched and how it went, which the API can read only from the DB.
- **One row per run, written at its end** (start, end, `success`, summed counts, the failed fetchers' errors), not a row per fetcher: the question is "when did it last run, and did it work"; a fetcher's details stay in the logs.
- **The counts are the NBA tables' only** (teams, players, standings, games), not the per-day copies (`team_players`, `standings_history`), so "updated" means the data changed.
  A failed fetcher adds nothing, the games' too, though its other days were written.
- **Revisit** for per-fetcher rows if a failure needs telling apart on the dashboard, or for a history page (`GET /scans` paged).
