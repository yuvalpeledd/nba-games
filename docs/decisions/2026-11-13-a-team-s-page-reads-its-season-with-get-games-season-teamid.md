# A team's page reads its season with `GET /games?season=&teamId=`

2026-11-13

- **`season` instead of `from`/`to`, only with `teamId`,** not paged: a team plays ~100 games a season (preseason and playoffs included), while the date range stays capped at 31 days for the league-wide schedule.
  Chosen over the web asking month by month (9 requests, and guessing where the playoffs end).
  Revisit if a season ever needs paging or a league-wide season list.
