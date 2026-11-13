import 'reflect-metadata';
import { Logger, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ScoreManagerScoresModule } from '@nba/score-manager-scores';
import { SqlModule } from '@nba/sql';
import { DataSource } from 'typeorm';

// The internal API that scores games' predictions into group_user_score (Scores in features.md). No auth: nothing
// outside the deployment may reach it.
@Module({
  imports: [
    SqlModule.forRoot({ runMigrations: false }),
    ScoreManagerScoresModule,
  ],
})
class ScoreManagerModule {}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(ScoreManagerModule);
  // Only frontend-api migrates: scores written to an older schema would miss its changes.
  if (await app.get(DataSource).showMigrations()) {
    await app.close();
    throw new Error(
      'The database has pending migrations: run them first (pnpm typeorm:run-migrations)',
    );
  }
  app.setGlobalPrefix('api');
  app.enableShutdownHooks();
  const port = process.env['PORT'] ?? 3001;
  await app.listen(port);
  Logger.log(`score-manager listening on http://localhost:${port}/api`);
}

bootstrap().catch((error: Error) => {
  Logger.error(error.message, error.stack);
  process.exitCode = 1;
});
