import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { GroupMemberEntity } from './group-member.entity';

@Injectable()
export class GroupMemberRepo extends Repository<GroupMemberEntity> {
  constructor(dataSource: DataSource) {
    super(GroupMemberEntity, dataSource.createEntityManager());
  }
}
