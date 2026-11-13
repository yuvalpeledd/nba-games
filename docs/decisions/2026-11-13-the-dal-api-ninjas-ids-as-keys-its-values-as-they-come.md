# The DAL: API Ninjas' ids as keys, its values as they come

2026-11-13

- **API Ninjas is the provider**, as decided (its basketball endpoints, the requests in the Postman collection).
  Four tables from its four endpoints: `teams`, `players`, `games`, `standings`; their columns are its fields, checked against its real responses (`schema.spec.ts`'s fixtures).
- **The provider's ids are the primary keys** (`nba-por`, `nba-20261111-bos-tor`), not a uuid plus an `external_id`: the fetcher writes foreign keys straight from a response (a player's `team.team_id`), with no lookup, and every write is one `upsert` on the key.
  Revisit if a second provider joins: then our own ids and a mapping table.
- **Its enum values and texts are stored as they come** (`'final'`, `'regular'`, records `5-1`, streak `W7`): no mapping code to keep in step.
  The enums are Postgres enums, so an undocumented status fails the write instead of passing through.
  Text where the values aren't documented (`decided_in`, `position`, `roster_status`) or are fixed words (`conference`, `division`).
- **Left out:** `league` and `sport` (always NBA), `season_label` (from `season`), centimeters and kilograms (from inches and pounds), the provider's `updated_at`.
  Add any of them when something reads it.
- **Postgres in tests**, as the starting conventions said: a `nba_test` database in the same container, which `schema.spec.ts` rebuilds through the migrations and checks for drift (TypeORM's schema builder: the SQL a migration would still need).
