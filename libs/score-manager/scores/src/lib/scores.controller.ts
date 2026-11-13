import { Controller, HttpCode, Param, Post } from '@nestjs/common';
import { type DataResponse, idSchema } from '@nba/dtos';
import { YupPipe } from '@nba/frontend-api-common';
import type { WriteCounts } from '@nba/sql-core';
import { ScoresService } from './scores.service';

// Internal: called by our own jobs, never the web (no sign-in; keep it off the public network).
@Controller('games')
export class ScoresController {
  constructor(private readonly scores: ScoresService) {}

  // Scores the final game's picks in every group of the users who made them: what it wrote.
  @Post(':gameId/check')
  @HttpCode(200)
  async check(
    @Param('gameId', new YupPipe(idSchema.required())) gameId: string,
  ): Promise<DataResponse<WriteCounts>> {
    return { data: await this.scores.check(gameId) };
  }
}
