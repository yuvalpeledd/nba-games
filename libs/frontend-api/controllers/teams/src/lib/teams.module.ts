import { Module } from '@nestjs/common';
import { TeamModule } from '@nba/sql-teams';
import { TeamsController } from './teams.controller';
import { TeamsService } from './teams.service';

@Module({
  imports: [TeamModule],
  controllers: [TeamsController],
  providers: [TeamsService],
})
export class FrontendApiTeamsControllerModule {}
