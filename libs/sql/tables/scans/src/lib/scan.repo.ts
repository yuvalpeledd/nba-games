import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ScanEntity } from './scan.entity';

@Injectable()
export class ScanRepo extends Repository<ScanEntity> {
  constructor(dataSource: DataSource) {
    super(ScanEntity, dataSource.createEntityManager());
  }
}
