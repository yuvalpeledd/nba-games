# The data-fetcher: four fetchers, a task pool for the games

2026-11-13

- **Every run runs every fetcher**, in order (teams, players, standings, games), as asked, rather than jobs picked by argument (the earlier plan): 32 calls plus the games' cap fits the free plan's hour.
  Revisit when one needs its own schedule (`--job` then).
- **"Delete" is a release and a replacement**, not a deleted row: a player on no roster gets `team_id` null, and today's `team_players` are replaced by the run's fetch (so a day holds its last fetch, not both teams of a trade day, as [Rosters by day: team_players](2026-11-13-rosters-by-day-team-players.md) first had it).
  Players and teams stay: `team_players`, games and standings point at them.
  The players fetcher writes nothing unless all 30 rosters came back, since a missing one would release a whole team.
- **The games' task pool is rebuilt from the table each run** (the days whose games aren't there or aren't over), with no queue of its own: a crash or a quota loses nothing, and a rerun picks up where it stopped.
  Nearest to today first, so a capped run brings what's current before the backfill.
  "Has its data" counts a played day's results, not just its rows, or its scores would never come.
- **No yup on the provider's responses** (the earlier plan): the tables' NOT NULLs, enums and foreign keys already refuse a missing or unknown value, and the response types are checked against real responses.
  Revisit if a nullable field arrives null when it shouldn't.
- **No retries:** every fetch is redone by the next run.
  **No bundle yet:** the app runs from its sources (ts-node), like the migrations CLI; webpack and a Cloud Run Job come with deployment.
- **The specs share `nba_test`**, so Nx runs test targets one at a time (`parallelism: false`): simpler than a database per project, while the suite takes seconds.
