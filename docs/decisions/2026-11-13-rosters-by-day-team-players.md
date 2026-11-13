# Rosters by day: `team_players`

2026-11-13

- **A row per day, team and player** (all three the key), as asked, from the daily roster fetch, rather than stints (`from` / `to` per team): a daily insert with no reads before it, idempotent, and a trade on any day is caught whatever the provider says about when it happened.
  A player on two teams the same day (a trade between fetches) is two rows, so the team is in the key.
- **Size:** about 500 rows a day, ~120,000 a season: fine for Postgres.
  Revisit (stints computed from the days, or kept beside them) if reading a player's teams over seasons gets slow, or for a "traded on" view.
- **`players.team_id` stays** as today's team: the common read needs no `MAX(date)`.
