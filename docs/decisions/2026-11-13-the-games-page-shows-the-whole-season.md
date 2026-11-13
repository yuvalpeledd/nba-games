# The games page shows the whole season

2026-11-13

- The games page lists every game of the current season at once (`GET /games?season=`, `teamId` now optional), filtered and sorted in the browser and shown 50 a page, instead of a league day at a time (as in [the web app](2026-11-13-the-web-app.md)).
- Why: the user wants every day in one table and to filter by date there; a season is bounded (~1,300 games), so one unpaged response is small enough.
- Date filters compare a game's league `date` (US Eastern), as schedules group them, not its tip-off on the viewer's clock.
- Revisit when the response gets slow, or for more than one season: page `GET /games` and move the filters to the server.
