import { Module } from '@nestjs/common';
import { GameModule } from '@nba/sql-games';
import { GroupMemberModule } from '@nba/sql-group-members';
import { GroupUserScoreModule } from '@nba/sql-group-user-score';
import { PredictionModule } from '@nba/sql-predictions';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';

@Module({
  imports: [
    GroupMemberModule,
    GroupUserScoreModule,
    GameModule,
    PredictionModule,
  ],
  controllers: [GroupsController],
  providers: [GroupsService],
})
export class FrontendApiGroupsControllerModule {}
