import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlayerDalService } from './player.dal.service';
import { PlayerEntity } from './player.entity';
import { PlayerRepo } from './player.repo';

// Registers its entity with the connection (autoLoadEntities) and exports only the DAL service.
@Module({
  imports: [TypeOrmModule.forFeature([PlayerEntity])],
  providers: [PlayerRepo, PlayerDalService],
  exports: [PlayerDalService],
})
export class PlayerModule {}
