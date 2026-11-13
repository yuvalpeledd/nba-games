import { DynamicModule, Module } from '@nestjs/common';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { join } from 'node:path';
import { DataSourceOptions } from 'typeorm';
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

// The specs' connection: the local container's `nba_test` database (never the dev one), dropped and rebuilt through
// the migrations by each spec file. Nx runs the test targets one at a time (nx.json), as they share it.
export function testPostgresOptions(): TypeOrmModuleOptions {
  return {
    ...postgresOptions({ ...process.env, DB_NAME: 'nba_test' }),
    entities: [],
    autoLoadEntities: true,
    dropSchema: true,
    migrationsRun: true,
  };
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
