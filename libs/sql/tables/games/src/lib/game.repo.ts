import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { GameEntity } from './game.entity';

@Injectable()
export class GameRepo extends Repository<GameEntity> {
  constructor(dataSource: DataSource) {
    super(GameEntity, dataSource.createEntityManager());
  }
}
