import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StandingDalService } from './standing.dal.service';
import { StandingEntity } from './standing.entity';
import { StandingRepo } from './standing.repo';

// Registers its entity with the connection (autoLoadEntities) and exports only the DAL service.
@Module({
  imports: [TypeOrmModule.forFeature([StandingEntity])],
  providers: [StandingRepo, StandingDalService],
  exports: [StandingDalService],
})
export class StandingModule {}
