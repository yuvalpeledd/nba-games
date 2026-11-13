import { Module } from '@nestjs/common';
import { StandingModule } from '@nba/sql-standings';
import { StandingsController } from './standings.controller';
import { StandingsService } from './standings.service';

@Module({
  imports: [StandingModule],
  controllers: [StandingsController],
  providers: [StandingsService],
})
export class FrontendApiStandingsControllerModule {}
