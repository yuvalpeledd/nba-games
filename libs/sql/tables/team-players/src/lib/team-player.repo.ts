import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { TeamPlayerEntity } from './team-player.entity';

@Injectable()
export class TeamPlayerRepo extends Repository<TeamPlayerEntity> {
  constructor(dataSource: DataSource) {
    super(TeamPlayerEntity, dataSource.createEntityManager());
  }
}
