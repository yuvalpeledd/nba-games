import { Module } from '@nestjs/common';
import { FrontendApiAuthModule } from '@nba/frontend-api-auth';
import { GameModule } from '@nba/sql-games';
import { PredictionModule } from '@nba/sql-predictions';
import { PredictionsController } from './predictions.controller';
import { PredictionsService } from './predictions.service';

@Module({
  imports: [FrontendApiAuthModule, GameModule, PredictionModule],
  controllers: [PredictionsController],
  providers: [PredictionsService],
})
export class FrontendApiPredictionsControllerModule {}
