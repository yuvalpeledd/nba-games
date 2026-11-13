# A team's record against an opponent, counted in the web

2026-11-13

- **`GET /games?teamId=&opponentId=` answers every game between the two, every season, unpaged,** and the games table's Statistics dialog counts the home and away record from it.
  Chosen over a stats endpoint: the web already has every game it needs, and ~4 games a season are cheap to count.
- **Every final counts,** preseason and playoffs too, as on the team's games table.
  Revisit if the record should be the regular season's only, or once the history spans enough seasons to need paging or a count in SQL.
