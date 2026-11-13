import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { PlayerEntity } from './player.entity';

@Injectable()
export class PlayerRepo extends Repository<PlayerEntity> {
  constructor(dataSource: DataSource) {
    super(PlayerEntity, dataSource.createEntityManager());
  }
}
