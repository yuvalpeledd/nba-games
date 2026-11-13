import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { FrontendApiAuthControllerModule } from '@nba/frontend-api-auth-controller';
import { FailureFilter } from '@nba/frontend-api-common';
import { FrontendApiGamesControllerModule } from '@nba/frontend-api-games-controller';
import { FrontendApiPlayersControllerModule } from '@nba/frontend-api-players-controller';
import { FrontendApiPredictionsControllerModule } from '@nba/frontend-api-predictions-controller';
import { FrontendApiSeasonsControllerModule } from '@nba/frontend-api-seasons-controller';
import { FrontendApiStandingsControllerModule } from '@nba/frontend-api-standings-controller';
import { FrontendApiTeamsControllerModule } from '@nba/frontend-api-teams-controller';
import { SqlModule } from '@nba/sql';
import { AppController } from './app.controller';

@Module({
  imports: [
    // The only app that runs migrations (CLAUDE.md's Database).
    SqlModule.forRoot({ runMigrations: true }),
    FrontendApiAuthControllerModule,
    FrontendApiSeasonsControllerModule,
    FrontendApiTeamsControllerModule,
    FrontendApiPlayersControllerModule,
    FrontendApiGamesControllerModule,
    FrontendApiStandingsControllerModule,
    FrontendApiPredictionsControllerModule,
  ],
  controllers: [AppController],
  // Nest's answers to failures, which it keeps for their request's log line (logRequests in main.ts).
  providers: [{ provide: APP_FILTER, useClass: FailureFilter }],
})
export class AppModule {}
