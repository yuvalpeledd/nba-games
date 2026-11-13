# Table filters in the browser

2026-11-13

- Every table filters its rows in the browser (`useTableFilters` in `@nba/web-table-components`), with portal's filters box (an "Add Filter" panel, a chip per filter), not through the API.
- Why: each table already holds all its rows (a team's season, a conference's standings, a roster), so the filters need no new query parameters and react instantly.
- A select's options are the values its rows have, so a filter never offers one that matches nothing.
- Revisit when a table pages through the API (games, players across the league): its filters must then go to the server, as portal's do.
