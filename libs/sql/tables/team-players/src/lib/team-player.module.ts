import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeamPlayerDalService } from './team-player.dal.service';
import { TeamPlayerEntity } from './team-player.entity';
import { TeamPlayerRepo } from './team-player.repo';

// Registers its entity with the connection (autoLoadEntities) and exports only the DAL service.
@Module({
  imports: [TypeOrmModule.forFeature([TeamPlayerEntity])],
  providers: [TeamPlayerRepo, TeamPlayerDalService],
  exports: [TeamPlayerDalService],
})
export class TeamPlayerModule {}
