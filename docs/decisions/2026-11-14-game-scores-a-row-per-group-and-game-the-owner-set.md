# Game scores: a row per group and game the owner set, 1 otherwise

2026-11-14

- **Only a set score has a row** (`group_game_score`); every other game is worth `DEFAULT_GAME_SCORE` (1), in `@nba/dtos-groups` so score-manager and the web read the same default, and a new game needs no row per group.
- **score-manager writes the weighted score into `group_user_score`** (the game's score if right, 0 if wrong), so the scoreboard stays a plain sum.
- **A game's score is set until it's completed (`final` or `canceled`)**, as asked, so it can still change while the game is live, after the picks lock; revisit by locking it at tip-off (`isPredictionLocked`) if members find that unfair.
  Since a completed game can't change, its scores are never rewritten; revisit (rescore the game) if changing a scored game is ever allowed.
- **A score is 0 to 100**: 0 lets an owner leave a game out; 100 is an arbitrary cap against typos.
- **The group's game scores come with `GET /groups/:id`** (no route of their own): only the set ones, at most a season's games.
