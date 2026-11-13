import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GameDalService } from './game.dal.service';
import { GameEntity } from './game.entity';
import { GameRepo } from './game.repo';

// Registers its entity with the connection (autoLoadEntities) and exports only the DAL service.
@Module({
  imports: [TypeOrmModule.forFeature([GameEntity])],
  providers: [GameRepo, GameDalService],
  exports: [GameDalService],
})
export class GameModule {}
