import {
  Body,
  Controller,
  Get,
  Param,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { type DataResponse, idSchema } from '@nba/dtos';
import {
  type PredictionDto,
  type PredictionsQuery,
  predictionsQuerySchema,
  type SetPredictionRequest,
  setPredictionRequestSchema,
} from '@nba/dtos-predictions';
import { AccessGuard, CurrentUser } from '@nba/frontend-api-auth';
import { YupPipe } from '@nba/frontend-api-common';
import type { UserEntity } from '@nba/sql-users';
import { PredictionsService } from './predictions.service';

// The signed-in user's picks of games' winners.
@Controller('predictions')
@UseGuards(AccessGuard)
export class PredictionsController {
  constructor(private readonly predictions: PredictionsService) {}

  @Get()
  async find(
    @CurrentUser() user: UserEntity,
    @Query(new YupPipe(predictionsQuerySchema)) { season }: PredictionsQuery,
  ): Promise<DataResponse<PredictionDto[]>> {
    return { data: await this.predictions.findBySeason(user.id, season) };
  }

  @Put(':gameId')
  async set(
    @CurrentUser() user: UserEntity,
    @Param('gameId', new YupPipe(idSchema.required())) gameId: string,
    @Body(new YupPipe(setPredictionRequestSchema))
    { pick }: SetPredictionRequest,
  ): Promise<DataResponse<PredictionDto>> {
    return { data: await this.predictions.set(user.id, gameId, pick) };
  }
}
