import { Controller, HttpCode, Param, Post } from '@nestjs/common';
import type { DataResponse } from '@nba/dtos';
import { type GameScores, ScoresService } from './scores.service';

// Internal: no auth, for whatever runs inside the deployment (nothing public may reach it).
@Controller('games')
export class ScoresController {
  constructor(private readonly scores: ScoresService) {}

  // ponytail: gameId isn't validated (no YupPipe outside frontend-api); any string is looked up, unknown is 404.
  @Post(':gameId/score')
  @HttpCode(200)
  async score(
    @Param('gameId') gameId: string,
  ): Promise<DataResponse<GameScores>> {
    return { data: await this.scores.score(gameId) };
  }
}
