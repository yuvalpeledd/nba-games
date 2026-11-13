# Open / next

- Questions:
  - **Player stats:** API Ninjas has no box scores or per-player stats (only teams, players, games and standings). Are team-level numbers (scores, per-period scores, standings) enough, or does a second source join for player stats?
  - **API Ninjas' plan:** the free plan is 3,000 calls a month (100 an hour), the current season only, no live scores, and its terms leave out commercial use and "data caching/storage", which storing its data in our DB may be. Is a paid plan (Developer: 100,000 calls, three past seasons) planned, or is this a personal project on the free one?
  - **The Postman collection's "Get Standings"** calls `basketballteams`; it should be `basketballstandings?league=nba` (the DAL follows the docs and its real response).
  - **What is "predict"?** The user picking winners (or scores, spreads) and tracking their accuracy, a model predicting outcomes from the stats, or both (the model's pick next to the user's)? This decides the `predictions` table and whether a `libs/model` lib exists.
  - **Who uses it?** Only you (no auth, or one shared password), or friends competing on predictions (accounts, a leaderboard: Firebase as in outly)?
  - **How much history?** The free plan has the current season only.
  - **Where does it run?** GCP as outly (Cloud Run for the API, a Cloud Run Job for the fetcher, Cloud SQL), or only locally for now?
- Next: `data-fetcher` (the API Ninjas client with the spec's mappers and yup validation, the four jobs, the app), then `web-app`; auth and predictions in `frontend-api` once the questions above are answered.
- Port `@Retry()` from outly.
- Scope tags: `scope:web` and `scope:data-fetcher` in `eslint.config.mjs` with their apps.
- `GET /players` has no search by name and no total count: add them when the web's players page needs them.
