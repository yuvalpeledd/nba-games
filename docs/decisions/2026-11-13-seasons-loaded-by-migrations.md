# `seasons`, loaded by migrations

2026-11-13

- **A table of seasons with their dates**, as asked, loaded by a data migration per season (2026-27: 2026-10-20 to 2027-04-11), apart from the table's own migration, so a season's dates are reviewed like code and every database gets the same rows.
  The provider has no seasons endpoint.
- **Not linked to `games` and `standings` yet:** their `season` is the provider's year (2026), and `seasons.id` is `nba-2026-27`.
  Revisit with the first query that joins them (a foreign key then, or `seasons.year`).
- **Its dates are the regular season's:** the play-in and playoffs run past `end_date`, so a playoff day's `findByDate` is null.
  Revisit if the playoffs need their season (an `end_date` through the Finals, or a column for it).
