# Group settings: changing how a group scores rescores it

2026-11-14

- **A group's `default_score`, `start_date` and `end_date` apply to every game, past ones too:** changing one has score-manager rescore every member there (`POST /api/groups/:groupId/score`), so the scoreboard always matches what the group's page says it counts.
  A game's own score (`group_game_score`) still can't change once the game is completed; only the group-wide settings reach back.
  Revisit if owners shouldn't be able to change a running competition's points (lock the settings once a game in range is final).
- **A rescore replaces the member's rows in the group in one transaction** (delete, then insert), so a game the new dates leave out loses its row, and a failed rescore leaves the old rows; frontend-api then undoes the change (503), as a failed join does.
- **Dates are days, both included, compared with the game's league `date`**, and either may be empty (no bound).
- **`max_members` is checked on join** (409 `GROUP_FULL`) and can't drop below the current members (409); existing groups got 1000, the most a group may have.
