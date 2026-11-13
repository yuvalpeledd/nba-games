import { Module } from '@nestjs/common';
import { GameModule } from '@nba/sql-games';
import { GroupGameScoreModule } from '@nba/sql-group-game-score';
import { GroupMemberModule } from '@nba/sql-group-members';
import { GroupUserScoreModule } from '@nba/sql-group-user-score';
import { PredictionModule } from '@nba/sql-predictions';
import { ScoresController } from './scores.controller';
import { ScoresService } from './scores.service';

@Module({
  imports: [
    GameModule,
    PredictionModule,
    GroupMemberModule,
    GroupUserScoreModule,
    GroupGameScoreModule,
  ],
  controllers: [ScoresController],
  providers: [ScoresService],
})
export class ScoreManagerScoresModule {}
