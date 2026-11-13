import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GroupGameScoreDalService } from './group-game-score.dal.service';
import { GroupGameScoreEntity } from './group-game-score.entity';
import { GroupGameScoreRepo } from './group-game-score.repo';

// Registers its entity with the connection (autoLoadEntities) and exports only the DAL service.
@Module({
  imports: [TypeOrmModule.forFeature([GroupGameScoreEntity])],
  providers: [GroupGameScoreRepo, GroupGameScoreDalService],
  exports: [GroupGameScoreDalService],
})
export class GroupGameScoreModule {}
