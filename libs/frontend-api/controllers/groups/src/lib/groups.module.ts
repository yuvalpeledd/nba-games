import { Module } from '@nestjs/common';
import { GameModule } from '@nba/sql-games';
import { GroupGameScoreModule } from '@nba/sql-group-game-score';
import { GroupMemberModule } from '@nba/sql-group-members';
import { GroupUserScoreModule } from '@nba/sql-group-user-score';
import { PredictionModule } from '@nba/sql-predictions';
import { GroupModule } from '@nba/sql-groups';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';

@Module({
  imports: [
    GroupModule,
    GroupMemberModule,
    GroupUserScoreModule,
    GameModule,
    PredictionModule,
    GroupGameScoreModule,
  ],
  controllers: [GroupsController],
  providers: [GroupsService],
})
export class FrontendApiGroupsControllerModule {}
