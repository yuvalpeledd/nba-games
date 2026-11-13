---
paths:
  - 'apps/web-app/**'
  - 'libs/web/**'
---

# Web conventions

For the web app: `apps/web-app` and its libs in `libs/web` (CLAUDE.md's Layout).

- **Server state:** React Query only (`queries.ts` in `libs/web/core`). Call the API through `api()` (`api.ts`, beside it), which unwraps `{ data }` and throws `ApiError`. No other fetching. Live games refetch on an interval (`refetchInterval`) only while one is live.
- **API calls:** relative `/api/...` paths (Vite's proxy locally, same origin in production).
- **UI:** MUI components wherever one exists, icons from `@mui/icons-material`. SCSS only for layout MUI doesn't cover. One theme (`theme.tsx`); don't restyle components per page.
- **Pages:** a lib each, `libs/web/pages/<kebab-name>` (`@nba/web-<kebab-name>-page`): `src/lib/<PascalName>Page.tsx`, optional `<kebab-name>-page.scss`, and the components only it uses, a folder each beside it, never exported. Pages import components libs and core by alias, never another page. Routes live in the shell lib's `AppShell`, which takes the pages from `app.tsx`.
- **Components:** one that a single page uses is in that page's lib; the rest in `libs/web/components/<group>`, a group per set of pages that use them, so a change reruns only those pages' specs.
- **Types:** import from `types.d.ts` with `import type`.
- **SCSS:** each file styles one root class (`.games-page`, BEM children `.games-page__row`). Mobile-first (`min-width` queries). Logical properties (`margin-inline-start`, `text-align: start`), never left/right. Touch targets ≥ 44px.
- **Dialogs:** render only while open (`{isOpen && <PredictDialog … />}`); `fullScreen` on phones; a form dialog's submit is in `DialogActions` with `form={id}`.
- **Every mutation ends in a toast:** success says what happened, failure goes through one shared failure toast (a known `code` says which, else "try again").
- **Tables:** sortable by any column; numbers right-aligned with tabular figures (`font-variant-numeric: tabular-nums`) so stat columns line up.
- **Stats formatting** lives in core (`formatPercentage`, `formatMinutes`, ...), one function per kind of number, so 47.3% and 34:12 read the same everywhere.
- **Times:** show a game's `startTime` in the viewer's time zone; group schedules by its `date` (see Game times in `features.md`). A season is shown as `2026-27`.
- **Charts:** load the chart library lazily (`lazy()` + `Suspense`) so it stays out of the main bundle; pick colors through the dataviz skill. Web tests mock it (jsdom has no canvas).
- **Text:** English only for now (see `docs/decisions.md`).
