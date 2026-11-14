# The games tables open unfiltered, with a Today button

2026-11-14

- The games tables (the games page's and a group's) open on every game of the season, no longer filtered to the games after two days ago ([the games page shows the whole season](2026-11-13-the-games-page-shows-the-whole-season.md)).
- A Today button beside Add Filter pages to the first row of today's league `date`, else of the last day before it with games, and scrolls that row to the top of the screen.
- Why: the user wants the whole season in view and the filters for their own use, with one click back to today.
- It goes by the rows as they're filtered and sorted, so sorted by another column it finds the first of today's rows in that order.
- Revisit when the games are paged on the server: the jump then needs today's offset from the API.
