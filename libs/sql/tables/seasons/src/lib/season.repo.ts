import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { SeasonEntity } from './season.entity';

@Injectable()
export class SeasonRepo extends Repository<SeasonEntity> {
  constructor(dataSource: DataSource) {
    super(SeasonEntity, dataSource.createEntityManager());
  }
}
