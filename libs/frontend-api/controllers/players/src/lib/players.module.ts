import { Module } from '@nestjs/common';
import { PlayerModule } from '@nba/sql-players';
import { TeamPlayerModule } from '@nba/sql-team-players';
import { PlayersController } from './players.controller';
import { PlayersService } from './players.service';

@Module({
  imports: [PlayerModule, TeamPlayerModule],
  controllers: [PlayersController],
  providers: [PlayersService],
})
export class FrontendApiPlayersControllerModule {}
