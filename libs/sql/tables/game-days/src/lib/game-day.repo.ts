import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { GameDayEntity } from './game-day.entity';

@Injectable()
export class GameDayRepo extends Repository<GameDayEntity> {
  constructor(dataSource: DataSource) {
    super(GameDayEntity, dataSource.createEntityManager());
  }
}
