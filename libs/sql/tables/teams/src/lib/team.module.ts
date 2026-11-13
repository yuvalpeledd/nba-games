import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeamDalService } from './team.dal.service';
import { TeamEntity } from './team.entity';
import { TeamRepo } from './team.repo';

// Registers its entity with the connection (autoLoadEntities) and exports only the DAL service.
@Module({
  imports: [TypeOrmModule.forFeature([TeamEntity])],
  providers: [TeamRepo, TeamDalService],
  exports: [TeamDalService],
})
export class TeamModule {}
