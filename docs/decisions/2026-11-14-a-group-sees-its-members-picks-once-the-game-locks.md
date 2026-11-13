# A group sees its members' picks once the game locks

2026-11-14

- `GET /groups/:id/games/:gameId/predictions` answers who picked before a game locks, and which team only after (`pick` null until then), on the server.
- Why: showing picks while they can still change lets a member copy the leader's, which makes the scoreboard meaningless.
- The data-fetcher asks score-manager to score a game once a fetch makes it final (a game it knew), right after the upsert, instead of score-manager polling for finals: the fetcher is the only thing that sees a game change.
- Revisit when a failed scoring call happens in practice (the next run doesn't retry it): then have each run score the final games with predictions but no `group_user_score` rows.
