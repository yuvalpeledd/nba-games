import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GameDayDalService } from './game-day.dal.service';
import { GameDayEntity } from './game-day.entity';
import { GameDayRepo } from './game-day.repo';

// Registers its entity with the connection (autoLoadEntities) and exports only the DAL service.
@Module({
  imports: [TypeOrmModule.forFeature([GameDayEntity])],
  providers: [GameDayRepo, GameDayDalService],
  exports: [GameDayDalService],
})
export class GameDayModule {}
