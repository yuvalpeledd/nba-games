import 'reflect-metadata';
import { Logger, Module } from '@nestjs/common';
import { APP_FILTER, NestFactory } from '@nestjs/core';
import {
  CloudLogger,
  FailureFilter,
  logRequests,
} from '@nba/frontend-api-common';
import { ScoreManagerScoresModule } from '@nba/score-manager-scores';
import { SqlModule } from '@nba/sql';
import { DataSource } from 'typeorm';

// The internal API that scores games' predictions into group_user_scores. No sign-in: keep it off the public network.
@Module({
  imports: [
    SqlModule.forRoot({ runMigrations: false }),
    ScoreManagerScoresModule,
  ],
  providers: [{ provide: APP_FILTER, useClass: FailureFilter }],
})
class ScoreManagerModule {}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(ScoreManagerModule, {
    logger:
      process.env['NODE_ENV'] === 'production' ? new CloudLogger() : undefined,
  });
  // Only frontend-api migrates: scoring on an older schema would write to it.
  if (await app.get(DataSource).showMigrations()) {
    throw new Error(
      'The database has pending migrations: run them first (pnpm typeorm:run-migrations)',
    );
  }
  app.use(logRequests());
  app.setGlobalPrefix('api');
  app.enableShutdownHooks();
  const port = process.env['SCORE_MANAGER_PORT'] ?? 3001;
  await app.listen(port);
  Logger.log(`score-manager listening on http://localhost:${port}/api`);
}

bootstrap().catch((error: Error) => {
  Logger.error(error.message, error.stack);
  process.exitCode = 1;
});
