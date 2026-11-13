# Predictions: a winner pick per user and game

2026-11-13

- **Users pick the winner, Home or Away**, a row per user and game (`predictions`, unique on both), as asked; no scores, spreads or model.
- **Taking a pick back keeps the row, `pick` null** (as asked), so `PUT /predictions/:gameId` is one upsert whatever the pick, and the web shows null as no prediction.
  Revisit (delete the row instead) if the nulls ever matter to counting.
- **A game locks at its start time, or once its status is anything but scheduled, postponed or delayed** (`isPredictionLocked`, shared by the API and the web), so a game the provider marks started or final early, or canceled, takes no picks even if its start time hasn't passed.
- **The pick is set in the games tables** (an Away / Home toggle while open, the pick as text once locked) rather than in a dialog: one click per game.
- **The cell has its own snackbar** (no app-wide toast exists yet): move it to a shared one when a second mutation needs a toast.
