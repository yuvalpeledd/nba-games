import 'reflect-metadata';
import { Logger, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FetchersModule, ScanService } from '@nba/data-fetcher-fetchers';
import { SqlModule } from '@nba/sql';
import { DataSource } from 'typeorm';

// One run (data-fetcher.md): a scan (every fetcher, recorded in `scans`), then exit, non-zero if any fetcher failed.
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
    process.exitCode = (await app.get(ScanService).run()) ? 0 : 1;
  } finally {
    await app.close();
  }
}

main().catch((error: Error) => {
  logger.error(error.message, error.stack);
  process.exitCode = 1;
});
