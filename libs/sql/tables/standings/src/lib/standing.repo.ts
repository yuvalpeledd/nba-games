import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { StandingEntity } from './standing.entity';

@Injectable()
export class StandingRepo extends Repository<StandingEntity> {
  constructor(dataSource: DataSource) {
    super(StandingEntity, dataSource.createEntityManager());
  }
}
