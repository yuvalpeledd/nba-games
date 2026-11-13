import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PredictionDalService } from './prediction.dal.service';
import { PredictionEntity } from './prediction.entity';
import { PredictionRepo } from './prediction.repo';

// Registers its entity with the connection (autoLoadEntities) and exports only the DAL service.
@Module({
  imports: [TypeOrmModule.forFeature([PredictionEntity])],
  providers: [PredictionRepo, PredictionDalService],
  exports: [PredictionDalService],
})
export class PredictionModule {}
