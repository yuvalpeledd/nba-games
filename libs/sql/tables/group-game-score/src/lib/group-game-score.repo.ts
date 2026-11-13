import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { GroupGameScoreEntity } from './group-game-score.entity';

@Injectable()
export class GroupGameScoreRepo extends Repository<GroupGameScoreEntity> {
  constructor(dataSource: DataSource) {
    super(GroupGameScoreEntity, dataSource.createEntityManager());
  }
}
