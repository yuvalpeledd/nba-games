import { DynamicModule, Module } from '@nestjs/common';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { createHash } from 'node:crypto';
import { basename, join } from 'node:path';
import { DataSource, DataSourceOptions } from 'typeorm';
import { DatabaseLogger } from './database-logger';
import { SnakeNamingStrategy } from './snake-naming.strategy';

// No table or migration is imported here, so what depends on this lib depends on none of them: each table's module
// registers its entity (autoLoadEntities), and TypeORM finds the migrations by location.
const fromSources = __filename.endsWith('.ts');

// migrations/ at the repo root; in a bundle, their compiled copies beside main.js.
const MIGRATIONS = fromSources
  ? join(__dirname, '../../../../migrations/*.ts')
  : join(__dirname, 'migrations/*.js');

// The entities by location, for a DataSource outside Nest (the migrations CLI), which loads the sources itself.
const ENTITIES = join(__dirname, '../../tables/*/src/lib/*.entity.ts');

// Postgres from the env, with the local container's defaults (docker-compose.yml).
export function postgresOptions(env: NodeJS.ProcessEnv): DataSourceOptions {
  const {
    DB_HOST = 'localhost',
    DB_PORT = '5432',
    DB_NAME = 'nba',
    DB_USER = 'nba',
    DB_PASSWORD = 'nba',
  } = env;
  return {
    type: 'postgres',
    host: DB_HOST,
    port: Number(DB_PORT),
    database: DB_NAME,
    username: DB_USER,
    password: DB_PASSWORD,
    entities: [ENTITIES],
    migrations: [MIGRATIONS],
    namingStrategy: new SnakeNamingStrategy(),
    logger: new DatabaseLogger(),
    maxQueryExecutionTime: 1000,
  };
}

// The specs' database: one per checkout and Nx project (`nba_test_<its folder>_<project>`: `nba_test_nba_games_sql_schema`,
// a worktree's `nba_test_<worktree>_<project>`), so test targets run in parallel, in a checkout and across worktrees,
// and never rebuild each other's mid-run. Never the dev one. Outside Nx (no NX_TASK_TARGET_PROJECT): `nba_test_<its folder>`.
export const TEST_DB_NAME = testDbName(
  basename(join(__dirname, '../../../..')),
  process.env['NX_TASK_TARGET_PROJECT'],
);

function testDbName(checkout: string, project?: string): string {
  const name = ['nba_test', checkout, project]
    .filter(Boolean)
    .join('_')
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_');
  // Postgres keeps 63 bytes of a name: a longer one ends in its hash, so two never truncate to the same.
  return name.length <= 63
    ? name
    : `${name.slice(0, 54)}_${createHash('sha1').update(name).digest('hex').slice(0, 8)}`;
}

// The specs' connection (TypeOrmModule.forRootAsync({ useFactory: testPostgresOptions })): their database, created on
// first use, dropped and rebuilt through the migrations by each spec file.
export async function testPostgresOptions(): Promise<TypeOrmModuleOptions> {
  const options = postgresOptions({ ...process.env, DB_NAME: TEST_DB_NAME });
  await createDatabaseIfMissing(options, TEST_DB_NAME);
  return {
    ...options,
    entities: [],
    autoLoadEntities: true,
    dropSchema: true,
    migrationsRun: true,
  };
}

// Through Postgres's own `postgres` database, which every server has.
async function createDatabaseIfMissing(
  options: DataSourceOptions,
  name: string,
): Promise<void> {
  const admin = new DataSource({
    ...options,
    database: 'postgres',
    entities: [],
    migrations: [],
  } as DataSourceOptions);
  await admin.initialize();
  try {
    const found = await admin.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [name],
    );
    if (!found.length) {
      // The name is ours (letters, digits and underscores): safe to quote as is.
      await admin.query(`CREATE DATABASE "${name}"`).catch((error) => {
        // Another spec created it in the meantime.
        if ((error as { code?: string }).code !== '42P04') throw error;
      });
    }
  } finally {
    await admin.destroy();
  }
}

// Import once, in an app's root module. Only frontend-api passes `runMigrations: true` (CLAUDE.md's Database).
@Module({})
export class SqlModule {
  static forRoot({ runMigrations }: { runMigrations: boolean }): DynamicModule {
    return {
      module: SqlModule,
      imports: [
        TypeOrmModule.forRootAsync({
          useFactory: () => ({
            ...postgresOptions(process.env),
            entities: [],
            autoLoadEntities: true,
            migrationsRun: runMigrations,
          }),
        }),
      ],
    };
  }
}
