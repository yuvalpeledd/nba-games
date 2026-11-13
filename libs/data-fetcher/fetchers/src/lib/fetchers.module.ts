import { Module } from '@nestjs/common';
import { ApiNinjasModule } from '@nba/data-fetcher-api-ninjas-client';
import { GameModule } from '@nba/sql-games';
import { SeasonModule } from '@nba/sql-seasons';
import { StandingModule } from '@nba/sql-standings';
import { TeamPlayerModule } from '@nba/sql-team-players';
import { TeamModule } from '@nba/sql-teams';
import { GamesFetcherService } from './games-fetcher.service';
import { PlayersFetcherService } from './players-fetcher.service';
import { StandingsFetcherService } from './standings-fetcher.service';
import { TeamsFetcherService } from './teams-fetcher.service';

const FETCHERS = [
  TeamsFetcherService,
  PlayersFetcherService,
  StandingsFetcherService,
  GamesFetcherService,
];

@Module({
  imports: [
    ApiNinjasModule,
    TeamModule,
    TeamPlayerModule,
    StandingModule,
    GameModule,
    SeasonModule,
  ],
  providers: FETCHERS,
  exports: FETCHERS,
})
export class FetchersModule {}
