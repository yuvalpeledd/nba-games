# Team logos from ESPN's CDN

2026-11-14

- A team's logo is hotlinked from ESPN's CDN by its abbreviation (`teamLogoUrl()` in `@nba/web-core`), with a map for the six abbreviations ESPN spells differently.
- Why: API Ninjas sends no logo, and ESPN's URLs need only the abbreviation we already store (the NBA's CDN needs its numeric team ids).
- A logo that fails to load (a moved franchise's) falls back to the abbreviation in MUI's `Avatar`.
- Revisit if ESPN blocks hotlinking or the provider starts sending logos: then store them (or their URLs) with the team.
