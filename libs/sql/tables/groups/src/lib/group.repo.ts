import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { GroupEntity } from './group.entity';

@Injectable()
export class GroupRepo extends Repository<GroupEntity> {
  constructor(dataSource: DataSource) {
    super(GroupEntity, dataSource.createEntityManager());
  }
}
