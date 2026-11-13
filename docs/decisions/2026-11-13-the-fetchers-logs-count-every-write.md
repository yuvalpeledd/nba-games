# The fetchers' logs count every write

2026-11-13

- **Counted by Postgres, in the write itself** (`upsertCounted` in `@nba/sql-core`), as asked ("x fetched, a added, b updated, c deleted"): `ON CONFLICT DO UPDATE … WHERE` a value is distinct (TypeORM's `skipUpdateIfNoValuesChanged`), `RETURNING (xmax = 0)` (true for an inserted row).
  Unchanged is what came back unwritten.
  No read before the write, and an unchanged row's `updated_at` stays, so it now means "changed".
  Revisit if Postgres's `xmax` behavior changes (it's an implementation detail, stable for decades).
- **`team_players`' day is diffed, not replaced:** the rows today's fetch no longer has are deleted and only the new ones inserted, so "deleted" counts real departures (a rerun the same day deletes 0, not 510).
- **Deletes appear only where the fetchers delete** (a day's `team_players`), with released players (`team_id` null) beside them; teams, games and standings are never deleted, so their lines say added, updated and unchanged.
