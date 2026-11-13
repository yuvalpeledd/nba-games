import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { TeamEntity } from './team.entity';

@Injectable()
export class TeamRepo extends Repository<TeamEntity> {
  constructor(dataSource: DataSource) {
    super(TeamEntity, dataSource.createEntityManager());
  }
}
