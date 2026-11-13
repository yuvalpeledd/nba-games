# `standings_history`, and the games' scores from the last scored day

2026-11-13

- **A row per day, season and team**, as asked, with the same columns as `standings` (an abstract `StandingColumns` both extend, so the two can't drift; `standings`' table is unchanged).
  It points at `standings` (season and team), so `recordStandings` writes both in one transaction from its lib, as the sql libs' rule has it.
  A second fetch the same day overwrites the day's row.
  Revisit (a row only when something changed) if ~5,000 rows a season ever matters.
- **The games' scores come from the last day with a scored game to today**, as asked, replacing the "a played day until all its games are over" rule ([The data-fetcher: four fetchers, a task pool for the games](2026-11-13-the-data-fetcher-four-fetchers-a-task-pool-for-the-games.md)): one `MAX(date)` instead of a status per day, and the last scored day is fetched again too, for its late games.
  With no scored game yet, from the season's start.
  The days with no games are still fetched, for the schedule.
  Revisit if a game left unscored on an earlier day (a suspended one) needs its score: this rule never goes back for it.
