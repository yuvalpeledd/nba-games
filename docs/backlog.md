# Open / next

- Questions:
  - **Player stats:** API Ninjas has no box scores or per-player stats (only teams, players, games and standings).
    Are team-level numbers (scores, per-period scores, standings) enough, or does a second source join for player stats?
  - **API Ninjas' plan:** the free plan is 3,000 calls a month (100 an hour), the current season only, no live scores, and its terms leave out commercial use and "data caching/storage", which storing its data in our DB may be.
    Is a paid plan (Developer: 100,000 calls, three past seasons) planned, or is this a personal project on the free one?
  - **The Postman collection's "Get Standings"** calls `basketballteams`; it should be `basketballstandings?league=nba` (the DAL follows the docs and its real response).
  - **Predictions beyond the winner pick:** users pick winners (`predictions`); is accuracy tracked (scoring, a record per user), and do scores, spreads or a model's pick join?
    `scorePrediction` scores a pick; the dashboard shows the user's own success rate (week and season), with no record of other users yet.
  - **Who uses it?** Accounts are in (outly's Firebase auth), and the app is private: everything needs a signed-in user.
    Do friends compete in groups (a leaderboard, roles)?
    Can anyone sign up, or only people you invite?
  - **Firebase in production:** local runs sign in against `yuval-nba-test-882ca`.
    Does production get a project of its own when it's deployed (set `GOOGLE_CLOUD_PROJECT`, `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`), or share it?
  - **How much history?** The free plan has the current season only.
  - **Where does it run?** GCP as outly (Cloud Run for the API, a Cloud Run Job for the fetcher, Cloud SQL), or only locally for now?
- **What may the players fetcher delete?** As built, nothing is deleted but the day's `team_players` rows it replaces: a player on no roster keeps their row with `team_id` null (their days point at them), and teams stay (everything points at them).
  Should players gone for a season be deleted, with their days?
- Next: a first real run (`API_NINJAS_KEY` in `.env`, then `pnpm nx run data-fetcher:run`: 32 calls plus up to 50 for the games), then the web-app's next pages (players).
- web-app: predictions show in the games tables and as the dashboard's counters (no page of a user's picks), and their toast is the prediction cell's own snackbar until an app-wide toast exists.
- Auth: no profile page (changing the name, email or password), no account deletion, and the navbar shows the name only while the rail is open.
  Add them when users ask.
- data-fetcher: a bundle and a Cloud Run Job (and its schedule) when it's deployed; it runs from its sources for now.
  A future day that has games is never checked again until its scores are due: refresh the ones not checked in a while (`game_days.checked_on`) if schedule changes (postponements, playoff dates) must show early.
  Page with `offset` if a response ever comes back cut (one page today).
- frontend-api: `GET /players` has no search by name and no total count, and `standings_history` has no route yet: add them when the web needs them.
- web-app: table filters aren't in the URL (portal's are), and dates have only portal's Date Range mode (no Dynamic Range or Specific Date), no quick filters and no header funnel.
- web-app: the dashboard has only the user's predictions and the last scan (no today's games); the standings tab and season aren't in the URL (back from elsewhere opens the current season's East), nor is a team page's tab; a team page shows only the current season (no season picker) and its players don't link to a player page yet.
