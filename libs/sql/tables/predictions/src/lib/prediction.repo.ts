import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { PredictionEntity } from './prediction.entity';

@Injectable()
export class PredictionRepo extends Repository<PredictionEntity> {
  constructor(dataSource: DataSource) {
    super(PredictionEntity, dataSource.createEntityManager());
  }
}
