import 'reflect-metadata';
import { Logger, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  FetchersModule,
  GamesFetcherService,
  PlayersFetcherService,
  StandingsFetcherService,
  TeamsFetcherService,
} from '@nba/data-fetcher-fetchers';
import { SqlModule } from '@nba/sql';
import { DataSource } from 'typeorm';

// One run (data-fetcher.md): every fetcher in this order (the players and the games need the teams), then exit,
// non-zero if any failed. A failure doesn't stop the fetchers after it.
const FETCHERS = [
  TeamsFetcherService,
  PlayersFetcherService,
  StandingsFetcherService,
  GamesFetcherService,
];

@Module({
  imports: [SqlModule.forRoot({ runMigrations: false }), FetchersModule],
})
class DataFetcherModule {}

const logger = new Logger('DataFetcher');

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(DataFetcherModule);
  try {
    // Only frontend-api migrates: a run on an older schema would write to it.
    if (await app.get(DataSource).showMigrations()) {
      throw new Error(
        'The database has pending migrations: run them first (pnpm typeorm:run-migrations)',
      );
    }
    let failed = 0;
    for (const fetcher of FETCHERS) {
      const started = Date.now();
      try {
        await app.get(fetcher).run();
        logger.log(`${fetcher.name} done in ${Date.now() - started} ms`);
      } catch (error) {
        failed++;
        logger.error(
          `${fetcher.name} failed: ${(error as Error).message}`,
          (error as Error).stack,
        );
      }
    }
    process.exitCode = failed ? 1 : 0;
  } finally {
    await app.close();
  }
}

main().catch((error: Error) => {
  logger.error(error.message, error.stack);
  process.exitCode = 1;
});
