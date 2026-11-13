import { Controller, HttpCode, Param, Post } from '@nestjs/common';
import { type DataResponse, idSchema } from '@nba/dtos';
import { YupPipe } from '@nba/frontend-api-common';
import { type GameScores, ScoresService } from './scores.service';

// Internal: no auth, for whatever runs inside the deployment (nothing public may reach it).
@Controller('games')
export class ScoresController {
  constructor(private readonly scores: ScoresService) {}

  @Post(':gameId/score')
  @HttpCode(200)
  async score(
    @Param('gameId', new YupPipe(idSchema.required())) gameId: string,
  ): Promise<DataResponse<GameScores>> {
    return { data: await this.scores.score(gameId) };
  }
}
