---
paths:
  - 'apps/web-app/**'
  - 'libs/web/**'
---

# Web conventions

For the web app: `apps/web-app` and its libs in `libs/web` (CLAUDE.md's Layout).

- **Server state:** React Query only (`queries.ts` in `libs/web/core`).
  Call the API through `api()` (`api.ts`, beside it), which unwraps `{ data }` and throws `ApiError`.
  No other fetching.
  Live games refetch on an interval (`refetchInterval`) only while one is live.
- **API calls:** relative `/api/...` paths (Vite's proxy locally, same origin in production).
  `api(method, path, body?)` sends `Bearer <Firebase ID token>` while there's a session; a 401 ends it.
- **Auth:** Firebase signs people in (`firebase/auth`, its own session in IndexedDB); `firebase.ts` loads its config once (`GET /api/firebase-config`).
  The session (`session.ts`, localStorage) is the `userId` that `/login` or `/sign-up` answered, so `useSession()` stays synchronous; `clearSession()` signs out of Firebase too.
  `LoginPage` (`/login`, full-screen, outside the navbar's layout) is outly's: Log in and Sign up tabs, Verify (the emailed link), Finish signing up (a login's 404: the name) and Reset password, with Firebase's errors as the page's own messages.
  Every page but `/login` is for someone signed in: `RequireAuth` (the shell's) wraps their routes and sends anyone else to `/login`; the navbar's end shows the user's name and Log out.
  `appWith`'s `renderAt` signs in first; `renderAt(path, { signedIn: false })` doesn't.
  Specs sign in with `signIn()` and fake Firebase's SDK (`firebase`, `firebaseError()` in test-utils).
- **UI:** MUI components wherever one exists, icons from `@mui/icons-material`.
  SCSS only for layout MUI doesn't cover.
  One theme (`theme.tsx`); don't restyle components per page.
- **Design system:** outly's.
  Colors only from `colors.scss` in the shell lib (`@use` it, then `text-color(secondary)`; MUI's palette comes from it through `theme.module.scss`).
  A look every MUI component of a kind shares goes in the design-system lib's partial for it (`_table.scss`, ...).
  A page's title is `<Typography variant="h1">`.
- **A new page:** its lib, its name in `PAGE_NAMES` and its route in `AppShell`, its entry in `app.tsx`, and a navbar item (`Navbar.tsx`) if it's a section.
- **Pages:** a lib each, `libs/web/pages/<kebab-name>` (`@nba/web-<kebab-name>-page`): `src/lib/<PascalName>Page.tsx`, optional `<kebab-name>-page.scss`, and the components only it uses, a folder each beside it, never exported.
  Pages import components libs and core by alias, never another page.
  Routes live in the shell lib's `AppShell`, which takes the pages from `app.tsx`.
- **Components:** one that a single page uses is in that page's lib; the rest in `libs/web/components/<group>`, a group per set of pages that use them, so a change reruns only those pages' specs.
  Two groups every page relies on:
  - `shell`: `AppShell` (providers, routes, the navbar around every page but `/login`), the theme and the palette (`colors.scss`), `PageLoader`;
  - `design-system`: outly's MUI overrides, app-wide; only `main.tsx` imports it.
- **Types:** import from `types.d.ts` with `import type`.
- **SCSS:** each file styles one root class (`.games-page`, BEM children `.games-page__row`).
  Mobile-first (`min-width` queries).
  Logical properties (`margin-inline-start`, `text-align: start`), never left/right.
  Touch targets ≥ 44px.
- **Dialogs:** render only while open (`{isOpen && <PredictDialog … />}`); `fullScreen` on phones; a form dialog's submit is in `DialogActions` with `form={id}`.
- **Every mutation ends in a toast:** success says what happened, failure goes through one shared failure toast (a known `code` says which, else "try again").
- **Tables:** sortable by any column (`useTableSort`); numbers right-aligned (`align="right"`, which the design system sets in tabular figures) so stat columns line up.
  A table that sits beside another (the standings' conferences) is `size="small"`, which the design system makes narrower.
- **Table filters:** every table has portal's filters box (`useTableFilters`, before `useTableSort`), filtering in the browser: each column declares its label, its type (`select` for text and yes/no, `number`, `date` for a day, a game's league `date`) and its value in a row, and the page renders the `filterBar` above the table.
- **Stat labels explain themselves:** a stat's label (a header through `headCell`'s `hint`, a term in a `<Tooltip describeChild>`) shows what it means on hover, from `statHints` in core, so every page says it the same way.
- **Stats formatting** lives in core (`formatPercentage`, `formatMinutes`, ...), one function per kind of number, so 47.3% and 34:12 read the same everywhere.
- **Times:** show a game's `startTime` in the viewer's time zone; group schedules by its `date` (see Game times in `features.md`).
  A season is shown as `2026-27`.
- **Charts:** load the chart library lazily (`lazy()` + `Suspense`) so it stays out of the main bundle; pick colors through the dataviz skill.
  Web tests mock it (jsdom has no canvas).
- **Text:** English only for now (see `docs/decisions/2026-11-13-the-starting-conventions.md`).
