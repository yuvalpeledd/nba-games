# Open / next

- Questions:
  - **Player stats:** API Ninjas has no box scores or per-player stats (only teams, players, games and standings). Are team-level numbers (scores, per-period scores, standings) enough, or does a second source join for player stats?
  - **API Ninjas' plan:** the free plan is 3,000 calls a month (100 an hour), the current season only, no live scores, and its terms leave out commercial use and "data caching/storage", which storing its data in our DB may be. Is a paid plan (Developer: 100,000 calls, three past seasons) planned, or is this a personal project on the free one?
  - **The Postman collection's "Get Standings"** calls `basketballteams`; it should be `basketballstandings?league=nba` (the DAL follows the docs and its real response).
  - **What is "predict"?** The user picking winners (or scores, spreads) and tracking their accuracy, a model predicting outcomes from the stats, or both (the model's pick next to the user's)? This decides the `predictions` table and whether a `libs/model` lib exists.
  - **Who uses it?** Only you (no auth, or one shared password), or friends competing on predictions (accounts, a leaderboard: Firebase as in outly)?
  - **How much history?** The free plan has the current season only.
  - **Where does it run?** GCP as outly (Cloud Run for the API, a Cloud Run Job for the fetcher, Cloud SQL), or only locally for now?
- Next: `data-fetcher` (the API Ninjas client with the spec's mappers and yup validation, the four jobs, the app), then `frontend-api`, starting with `GET /api/teams` and `GET /api/standings` as `dtos-teams` and `dtos-standings` define them (the web-app already calls them).
- web-app: the dashboard only says hello; the teams list has no team page yet; the standings tab isn't in the URL (back from elsewhere opens East).
- Port `@Retry()` and `YupPipe` from outly.
- `SqlModule` has no test of its own yet: the first app's boot checks it.
- Scope tags in `eslint.config.mjs` once the apps exist (CLAUDE.md's Layout).
