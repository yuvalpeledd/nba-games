# Scores: a row per group, user and game, written by score-manager

2026-11-14

- **Scores are stored now** (`group_user_score`, as asked), a row per group the user is in, so a group's leaderboard is a sum over its rows; the pick itself stays one per user and game, so a user scores the same in each of their groups.
- **score-manager scores with `scorePrediction`**, the function the web runs, so the server's 1 and 0 and the dashboard's right and wrong can't disagree.
- **Only picks are scored:** a taken-back pick (null) gets no row, as the web shows it as no prediction; revisit if a missing pick must count as 0 on a leaderboard.
- **A game is scored only once final with a winner**, else 409 and nothing written; scoring it again overwrites (upsert), so a corrected result is a rerun.
- **The route has no auth** ("internal"): it only recomputes from the DB, but anything that can reach it can make it write; revisit with a shared secret or Cloud Run IAM when it's deployed.
- **It runs from its sources** like data-fetcher (no bundle) until it's deployed.
