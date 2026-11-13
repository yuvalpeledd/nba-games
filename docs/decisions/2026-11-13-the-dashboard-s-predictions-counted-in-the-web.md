# The dashboard's predictions, counted in the web

2026-11-13

- **The dashboard's Predictions counters (left this week, success this week and this season) are counted in the web** from the season's games and the caller's predictions, which the games page already loads, with `scorePrediction` from `@nba/dtos-predictions`.
  Chosen over a stats endpoint: no new route, and React Query shares both lists with the games page.
- **This week is Monday to Sunday around the viewer's today**, matched against the games' league `date`.
  **Success is right picks over scored ones**: games final with a winner that the user picked; unpicked, unfinished and canceled games don't count.
- **Left this week links to the games table filtered to this week's scheduled games without a pick**, its filters in the navigation's state rather than the URL, since table filters aren't in the URL yet.
  The counter also counts postponed and delayed games not yet begun, which the Scheduled filter leaves out.
  Revisit when a leaderboard needs every user's record (count it in SQL then), or if the week should be the league's (US Eastern) rather than the viewer's.
