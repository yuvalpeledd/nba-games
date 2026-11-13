import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeasonDalService } from './season.dal.service';
import { SeasonEntity } from './season.entity';
import { SeasonRepo } from './season.repo';

// Registers its entity with the connection (autoLoadEntities) and exports only the DAL service.
@Module({
  imports: [TypeOrmModule.forFeature([SeasonEntity])],
  providers: [SeasonRepo, SeasonDalService],
  exports: [SeasonDalService],
})
export class SeasonModule {}
