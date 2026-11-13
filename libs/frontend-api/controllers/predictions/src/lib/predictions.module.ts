import { Module } from '@nestjs/common';
import { GameModule } from '@nba/sql-games';
import { PredictionModule } from '@nba/sql-predictions';
import { PredictionsController } from './predictions.controller';
import { PredictionsService } from './predictions.service';

@Module({
  imports: [GameModule, PredictionModule],
  controllers: [PredictionsController],
  providers: [PredictionsService],
})
export class FrontendApiPredictionsControllerModule {}
