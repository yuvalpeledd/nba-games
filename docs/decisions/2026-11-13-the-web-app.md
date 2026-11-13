# The web-app

2026-11-13

- **On `frontend-api`'s contracts:** the standings page asks `/seasons` for the current season (the newest that has started, else the newest) and joins `/standings?season=` with `/teams` for the names; the teams page lists the active teams (`/teams` has past franchises too).
  The specs run on a fake API with the same routes.
- **outly's design system, copied, not shared:** its palette (`colors.scss`, without the order-status, semantic and gradient maps), `theme.tsx` without RTL, locales and date pickers, and its MUI overrides (all but rich text).
  No package spans the two repos; revisit if both keep changing it.
- **The navbar and page layout live in the shell lib,** not a `layout` lib as in outly: every page has the same one, and `AppShell` renders it as the routes' layout.
  Split it out when a page needs a different frame (a full-screen login).
- **Games behind are computed on the web, from the conference's leader:** the provider's `games_behind` is from the division's, which reads wrong in a conference table.
  Move it into the API's `StandingDto` if another client needs it.
- **Left out of outly's shell for now:** toasts (no mutations), the error boundary and error page, scroll-to-top, table paging (30 rows at most).
  Add each with the first page that needs it.
