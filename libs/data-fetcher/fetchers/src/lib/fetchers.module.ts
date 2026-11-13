import { Module } from '@nestjs/common';
import { ApiNinjasModule } from '@nba/data-fetcher-api-ninjas-client';
import { GameDayModule } from '@nba/sql-game-days';
import { GameModule } from '@nba/sql-games';
import { ScanModule } from '@nba/sql-scans';
import { SeasonModule } from '@nba/sql-seasons';
import { StandingHistoryModule } from '@nba/sql-standings-history';
import { TeamPlayerModule } from '@nba/sql-team-players';
import { TeamModule } from '@nba/sql-teams';
import { GamesFetcherService } from './games-fetcher.service';
import { PlayersFetcherService } from './players-fetcher.service';
import { ScanService } from './scan.service';
import { StandingsFetcherService } from './standings-fetcher.service';
import { TeamsFetcherService } from './teams-fetcher.service';

const SERVICES = [
  TeamsFetcherService,
  PlayersFetcherService,
  StandingsFetcherService,
  GamesFetcherService,
  ScanService,
];

@Module({
  imports: [
    ApiNinjasModule,
    TeamModule,
    TeamPlayerModule,
    StandingHistoryModule,
    GameModule,
    GameDayModule,
    SeasonModule,
    ScanModule,
  ],
  providers: SERVICES,
  exports: SERVICES,
})
export class FetchersModule {}
