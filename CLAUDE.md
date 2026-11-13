# CLAUDE.md

**NBA Games** shows NBA games, teams and player statistics, and lets the user predict what will happen (see Predictions in `.claude/rules/features.md`).

**What exists** is the repo's to say (`pnpm nx show projects`, `ls libs/sql/tables`), not this file's.
A lib below that doesn't exist yet is the plan: when you scaffold one, follow this file, and fix it where reality differs.

**The data comes from [API Ninjas](https://api-ninjas.com/api/nba)** (`api.api-ninjas.com/v1/basketball*`); the requests are in the user's Postman collection.
See `.claude/rules/data-fetcher.md`.

**Keep the docs current.** When a change touches architecture, conventions, commands or infra, update this file, `.claude/rules/` and `docs/` in the same change.
Log a non-obvious choice as a new file in `docs/decisions/` (see its README): the decision, why, and when to revisit, in a few lines (what was built and how it was checked go in the commit message, not there).
Keep `docs/backlog.md` (Open / next) current.
Write rules as rules, not history.

**Write docs so parallel branches don't conflict:** several agents work at once, each on its own branch, and git merges line by line.

- One sentence per line (continuation lines indented under their bullet): an edit touches only its sentence.
- No lists every change appends to, here or in the rules (what's built so far, every table, every page, every controller): the repo has those.
  Describe the pattern and one example.
- A new decision is a new file, never an insert into a shared one.

**Area rules** (`.claude/rules/`) load with the files they cover.
Starting cold, read the one for your area first:

- `web.md`: Web conventions (`apps/web-app`, `libs/web`).
- `data-fetcher.md`: the cron job that pulls NBA data (`apps/data-fetcher`, `libs/data-fetcher`).
- `features.md`: how each feature works on the server (`apps/frontend-api`, `libs/`): the NBA data model, seasons and game status, predictions.

## Layout

Node 24, pnpm, Nx.
Every import alias is `@nba/<name>`, in `tsconfig.base.json`.

- `apps/data-fetcher`: NestJS standalone app (no HTTP server, run from its sources), run on a schedule: one run fetches teams, players, standings and games from API Ninjas into the DB, and exits.
  Only `main.ts`.
  See `.claude/rules/data-fetcher.md`
- `apps/frontend-api`: NestJS 11 HTTP server (webpack).
  Thin: bootstrap, root module, `GET /api/health`, and it serves the web build in production.
  Its `build` runs `compile-migrations` (`tsconfig.migrations.json`) into `dist/apps/frontend-api/migrations/`, beside `main.js`, where `SqlModule` finds them
- `apps/web-app`: React 19 + Vite SPA (MUI, React Query, React Router).
  The app is only its entry, `index.html`, `public/` and `app.tsx`; the rest is in `libs/web` (see `.claude/rules/web.md`):
  - `libs/web/core` (`@nba/web-core`): what isn't UI: `api()`, the React Query hooks (`queries.ts`), formatting
  - `libs/web/components/<group>` (`@nba/web-<group>-components`): components more than one page uses, a lib per group the same pages use (the groups: `.claude/rules/web.md`)
  - `libs/web/pages/<page>` (`@nba/web-<page>-page`): a lib per page, with the components only it uses
  - `libs/web/test-utils` (`@nba/web-test-utils`): spec-only fakes and render helpers
- `libs/sql`: TypeORM, as Nx libs (see Server conventions):
  - `libs/sql/tables/<table>` (`@nba/sql-<table>`, e.g. `@nba/sql-games`): one lib per table: entity, repo, DAL service, module, and the enums only it stores
  - `libs/sql/core` (`@nba/sql-core`): `BaseAbstractEntity` (`created_at`, `updated_at`), `CreateObject`, `Venue`
  - `libs/sql/aggregates/<root>` (`@nba/sql-<root>-aggregate`): writes across tables that no table lib can make
  - `libs/sql/database` (`@nba/sql`): `SqlModule.forRoot({ runMigrations })` (the connection; imports no table and no migration), `postgresOptions(env)`, `testPostgresOptions()` and `TEST_DB_NAME` (the specs') and the migrations CLI's data source
  - `libs/sql/schema` (project `sql-schema`, imported by nothing, tagged `scope:data-fetcher` for the client it reads): `schema.spec.ts`, every table against the real migrations with the provider's real responses (the client's fixtures)
- `migrations/`: TypeORM migrations, outside every lib, loaded by location
- `libs/enums` (`@nba/enums`): enums more than one table stores, or none does (no deps, web-safe)
- `libs/dtos/<name>` (`@nba/dtos-<name>`, e.g. `@nba/dtos-games`): request/response contracts shared by the server and the web (web-safe): yup schemas, DTO types and the logic both sides run, a lib per file.
  `libs/dtos/common` (`@nba/dtos`): what they all share (`DataResponse<T>`, the common schemas)
- `libs/data-fetcher/api-ninjas-client` (`@nba/data-fetcher-api-ninjas-client`): `ApiNinjasClient`, the provider's response types and mappers to our rows; `@nba/data-fetcher-api-ninjas-client/fixtures` (spec-only): its real responses
- `libs/data-fetcher/fetchers` (`@nba/data-fetcher-fetchers`): `FetchersModule` and a `*-fetcher.service.ts` per kind of data: teams, players, standings, games (see `.claude/rules/data-fetcher.md`)
- `libs/frontend-api/common` (`@nba/frontend-api-common`): `YupPipe`, `FailureFilter`, `logRequests`, `CloudLogger`
- `libs/frontend-api/test-utils` (`@nba/frontend-api-test-utils`): spec-only `TestApp` (HTTP + DB + seeding) and `generate*()` test data
- `libs/frontend-api/controllers/<name>` (`@nba/frontend-api-<name>-controller`): one controller per lib, with its service (DAL reads → DTOs, 404s), e.g. `libs/frontend-api/controllers/games`

**Dependency direction:** apps → feature libs → dal (`sql-*`) → `sql-core`.
`dtos` and `enums` import nothing server-only.
`frontend-api` and `data-fetcher` never import each other's libs: what both need lives in `sql-*`, `dtos-*` or `enums`.
Tag projects (`scope:web`, `scope:frontend-api`, `scope:data-fetcher`, `scope:shared`) and enforce it in `eslint.config.mjs`'s `depConstraints`.

## Commands

```bash
pnpm install
docker compose up -d db                            # local Postgres (see Database)
pnpm nx run-many -t serve -p frontend-api web-app  # API :3000, web :4200 (proxies /api)
pnpm nx run data-fetcher:run                       # one fetch run against the local DB (API_NINJAS_KEY in .env: real calls, real quota)
pnpm nx affected -t lint test build typecheck      # full check: run before handing work back
pnpm nx test sql-schema                            # or data-fetcher-fetchers / frontend-api-<name>-controller / web-<page>-page / ...
pnpm nx format:write
pnpm nx g @nx/nest:lib libs/<path> --name=<name> --importPath=@nba/<name> --unitTestRunner=jest --no-interactive
```

## API conventions

- **Validation:** every value a handler reads (body, params, query) is validated with yup through `YupPipe` and a schema from its dtos lib.
  Unknown body fields are stripped.
- **Shared DTOs:** request and response DTOs live in the dtos libs, one file per lib, so a change reaches only what imports it.
  Keep them free of server-only imports; the web forms validate with the same schemas.
- **No entities in responses:** controllers map entities to DTOs (`toGameDto(...)`) and never return an entity.
- **Response shape:** always JSON.
  One object is `{ data: {...} }`, a list `{ data: [...] }` (`DataResponse<T>`).
  Errors keep Nest's `{ statusCode, message }`; add a `code` (`ErrorCode` in `@nba/enums`) when the client must tell errors apart.
- **Lists are paged** where they can grow (games, players, box scores): `?limit=&offset=` (or a date range for games), never the whole table.
- **Where controllers go:** a new controller gets its own lib, `libs/frontend-api/controllers/<name>/`, importing the DAL modules it needs.
  Register its module in `apps/frontend-api/src/app/app.module.ts` and write its spec (see Testing).
- **Read-only NBA data:** the API never writes games, teams, players or stats; only `data-fetcher` does.
  The API writes only what users own (predictions).

## Testing

Every controller has `<name>.controller.spec.ts` beside it and is tested over HTTP (pipes + controller + DB) with `TestApp` from `@nba/frontend-api-test-utils`:

```ts
describe('GamesController', () => {
  let app: TestApp;
  beforeAll(async () => {
    app = await TestApp.create([FrontendApiGamesControllerModule]);
  });
  afterAll(() => app.close());
  beforeEach(() => app.clearDatabase());

  describe('GET /games', () => {
    describe('validation', () => {
      /* one it() per yup rule, asserting the 400 and its message */
    });
    describe('behavior', () => {
      /* flows: assert the response and the DB state (through the DAL services) */
    });
  });
});
```

- Add an `auth` block (one `it()` per caller: no token 401, each refused role 403, each allowed one) once routes are guarded.
- **Seeding:** `app.createTeam()`, `app.createGame(home, away, overrides)`, ... built with `generate*()` and saved through the DAL.
  Pass overrides only for what the test is about.
- **DB state:** read it back with `app.get(<X>DalService)`.
  `clearDatabase()` empties every registered table; it never drops the schema.
- **data-fetcher:** the fetchers run for real against the test DB with only `fetch` faked, answering with the provider's recorded responses (see Tests in `.claude/rules/data-fetcher.md`).
  Never call the real provider from a test.
- **A spec that needs the DB** connects with `TypeOrmModule.forRootAsync({ useFactory: testPostgresOptions })` (`@nba/sql`), which creates the checkout's test database if it's missing and rebuilds it through the migrations, and empties its tables (`TRUNCATE`) before each test.
  `seasons` stays: its migrations load it.
- **Web specs** sit in the lib of the page they drive and run against a fake API (`stubApi`).
  Find lazy content with `findBy*`, never `getBy*`.
- **Predictions logic** (scoring, locking) is a plain function in its dtos lib with its own spec.

## Server conventions

- **Logging:** Nest's `Logger`; JSON lines in production (`CloudLogger`), colored locally.
  Every API call gets one line when done (method, path without query, status, time).
  `log` for what happened, `warn` for unexpected but survived, `error` for failures, with `stackOf(error)`.
  Never tokens, passwords or request bodies.
- **External calls** have a timeout (`AbortSignal.timeout`) and no retries where a later run redoes the work (the data-fetcher).
  Add `@Retry()` (outly's) for the first call that can't wait for a rerun.
- **Config from env**, read once at boot and validated; a missing required value fails the boot with its name.
- **NBA tables are keyed by the provider's id** (`teams.id` = `nba-por`, `games.id` = `nba-20261111-bos-tor`; `standings` by `season` + `team_id`), so the fetcher writes foreign keys straight from a response and every write is an upsert on the key: `upsertCounted(manager, Entity, rows, [key])` (`@nba/sql-core`), which updates only rows that changed (so `updated_at` means changed) and returns what it did (`{ inserted, updated, unchanged }`) for the logs.
  Their enums' values are the provider's (`GameStatus.FINAL = 'final'`), stored as they come.
  A table of our own (predictions) gets a uuid.
- One lib per table (`libs/sql/tables/<table>/`, `@nba/sql-<table>`), files in `src/lib/`:
  - `game.entity.ts`: `GameEntity extends BaseAbstractEntity`, plus `GameCreateObject = CreateObject<GameEntity, ...>`.
  - `game.repo.ts`: `GameRepo extends Repository<GameEntity>`.
  - `game.dal.service.ts`: the only data API other code uses.
  - `game.module.ts`: provides the repo + DAL service, `TypeOrmModule.forFeature([GameEntity])`, and **exports only the DAL service**.
  - `src/enums.ts` when the table stores enums no other table does: no imports, exposed as `@nba/sql-<table>/enums` for dtos and the web (which can't load the barrel).
- Entity classes end in `Entity`.
  The barrel exports the module, DAL service, entity class (as a type for everyone but other sql libs), types and enums; never the repo.
- **The sql libs import each other the way the foreign keys point** (`sql-box-scores` imports `sql-games` and `sql-players`, never the reverse).
  A write across tables lives in the lowest table's DAL, else in an aggregate lib.
- Columns: camelCase properties, snake_case columns (`SnakeNamingStrategy`).
  Declare every FK twice: a scalar column (`@Column({ type: 'uuid' }) gameId`) and the relation (`@ManyToOne` + `@JoinColumn({ name: 'game_id' })`).
  No inverse relations (`@OneToMany`).
- Nullable columns need an explicit `type`.
  Don't set `enumName`.
  Times are `timestamptz` in UTC.
- **Enums:** UPPERCASE keys; values the provider's for NBA data, readable for ours (`OWNER = 'Owner'`).
  In the lib of the one table that stores them, else `@nba/enums`.
  Values are stored, so renaming one needs a migration.
- The root `dependencies` are the server apps' runtime deps (the image installs only those).
  What Vite bundles goes in `devDependencies`.

## Database

- **Postgres everywhere** (17): locally the `nba-db` container (`docker-compose.yml`, user, password and database `nba`, the defaults of `postgresOptions`).
  `synchronize` is off; schema changes are migrations.
- **Each checkout's specs have a database of their own** in the same container, `TEST_DB_NAME`: `nba_test_<the checkout's folder>` (`nba_test_nba_games`; a worktree's `nba_test_<worktree>`), created on first use.
  So agents testing in parallel worktrees never rebuild each other's mid-run.
  `schema.spec.ts` drops and rebuilds it through the migrations, reverts and reruns the last one, and fails when the entities differ from the migrations (it prints the missing SQL).
  A checkout's specs share it, so Nx runs the test targets one at a time (`parallelism: false` in `nx.json`), and a project keeps its DB tests in one spec file.
  `TestApp` connects with `testPostgresOptions()` and empties every table (seasons too) in `clearDatabase()`, which refuses any database but `TEST_DB_NAME`.
  A removed worktree leaves its database behind: `DROP DATABASE nba_test_<worktree>` to tidy up.
- **Migrations:** generate against the local container, never a shared DB:
  ```bash
  pnpm typeorm:run-migrations
  pnpm typeorm:generate-migration <change>   # → migrations/<ts>-<change>.ts, then pnpm nx format:write
  pnpm nx test sql-schema                    # reverts, reruns, and checks for drift
  ```
  **Check port 5432 first** (`lsof -nP -iTCP:5432 -sTCP:LISTEN`): a Cloud SQL proxy there is a real database.
  If anything holds it, `DB_PORT=5433 docker compose up -d db` and put `DB_PORT=5433` before every command.
- A new table: a lib with a sibling's `project.json`, tsconfigs and `eslint.config.mjs` (its name and paths changed), its alias in `tsconfig.base.json`, a test in `schema.spec.ts` (and its table in the `TRUNCATE`), then a migration.
- **Only `frontend-api` runs migrations** (at boot).
  `data-fetcher` refuses to run while any are pending, so a job never writes to an old schema.
- **Never drop or truncate the local DB** from scripts or verification runs: the user's own data may be there.
  Throwaway runs use their own database name and a port other than 3000, and stop only the PIDs they started.
- Env: `DB_HOST` (localhost), `DB_PORT` (5432), `DB_NAME`, `DB_USER`, `DB_PASSWORD` (`nba`), `PORT` (3000), `WEB_DIR` (container only), and the provider's (see `data-fetcher.md`).

## Gotchas

Carried over from outly; they apply here too.

- A running `nx serve` doesn't pick up a new alias in `tsconfig.base.json` (a new lib): restart it.
- NestJS 12 is ESM-only; stay on Nest 11 (what Nx generates) until Nx supports 12.
- pnpm fails installs until each dependency's build script is approved or denied (`allowBuilds` in `pnpm-workspace.yaml`): `pnpm approve-builds <pkg>`.
- `pnpm-lock.yaml` is in `.prettierignore`: pnpm owns its format.
- Postgres can't use an enum value in the transaction that adds it ("unsafe use of new value"): a check or default naming new values compares them as text.
- The lib generator's `--unitTestRunner=jest` writes a `jest.config.cts` with its own transform: keep only the preset, as a sibling's does, and delete the generated README.
- An effect whose arrow returns a value (`useEffect(() => window.scrollTo(0, 0))`) hands React that value as its clean-up: give effects a block body.
- While an MUI dialog is open the page behind it is `aria-hidden`: web tests find what's under it with `{ hidden: true }`.

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (`pnpm nx build`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->
