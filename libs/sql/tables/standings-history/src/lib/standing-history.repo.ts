import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { StandingHistoryEntity } from './standing-history.entity';

@Injectable()
export class StandingHistoryRepo extends Repository<StandingHistoryEntity> {
  constructor(dataSource: DataSource) {
    super(StandingHistoryEntity, dataSource.createEntityManager());
  }
}
