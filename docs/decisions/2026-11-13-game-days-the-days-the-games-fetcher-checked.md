# `game_days`: the days the games fetcher checked

2026-11-13

- **A row per day fetched, empty days included** (its game count and `checked_on`), so a day without games is asked for once instead of every run.
  Chosen over a placeholder row in `games` (it would break its NOT NULLs and foreign keys for every reader), a list of off-days on `seasons` (by hand, wrong when the league reschedules) and inferring from `games` (an empty day looks like one never fetched).
  It also replaces "a day with no games" as the pool's test for the schedule: never checked is the test now.
- **`checked_on` is a league day, not a timestamp:** an empty day is final only when checked on or after it, so a day checked before its schedule was out (playoffs, the NBA Cup's knockouts) is asked for again on its day; and a day string compares and tests without a clock.
  Its migration fills it from the games already stored, so a database that has them doesn't fetch the season again.
- **Revisit** to refresh future days with games not checked in a while (postponements), from `checked_on`.
