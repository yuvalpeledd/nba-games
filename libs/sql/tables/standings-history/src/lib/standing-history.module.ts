import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StandingHistoryDalService } from './standing-history.dal.service';
import { StandingHistoryEntity } from './standing-history.entity';
import { StandingHistoryRepo } from './standing-history.repo';

// Registers its entity with the connection (autoLoadEntities) and exports only the DAL service.
@Module({
  imports: [TypeOrmModule.forFeature([StandingHistoryEntity])],
  providers: [StandingHistoryRepo, StandingHistoryDalService],
  exports: [StandingHistoryDalService],
})
export class StandingHistoryModule {}
