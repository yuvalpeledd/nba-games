import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GroupUserScoreDalService } from './group-user-score.dal.service';
import { GroupUserScoreEntity } from './group-user-score.entity';
import { GroupUserScoreRepo } from './group-user-score.repo';

// Registers its entity with the connection (autoLoadEntities) and exports only the DAL service.
@Module({
  imports: [TypeOrmModule.forFeature([GroupUserScoreEntity])],
  providers: [GroupUserScoreRepo, GroupUserScoreDalService],
  exports: [GroupUserScoreDalService],
})
export class GroupUserScoreModule {}
