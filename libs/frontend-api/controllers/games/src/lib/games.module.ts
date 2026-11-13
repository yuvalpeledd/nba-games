import { Module } from '@nestjs/common';
import { GameModule } from '@nba/sql-games';
import { GamesController } from './games.controller';
import { GamesService } from './games.service';

@Module({
  imports: [GameModule],
  controllers: [GamesController],
  providers: [GamesService],
})
export class FrontendApiGamesControllerModule {}
