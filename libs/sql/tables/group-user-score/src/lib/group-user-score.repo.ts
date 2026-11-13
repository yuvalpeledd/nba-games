import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { GroupUserScoreEntity } from './group-user-score.entity';

@Injectable()
export class GroupUserScoreRepo extends Repository<GroupUserScoreEntity> {
  constructor(dataSource: DataSource) {
    super(GroupUserScoreEntity, dataSource.createEntityManager());
  }
}
