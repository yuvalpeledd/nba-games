import { Controller, HttpCode, Param, Post } from '@nestjs/common';
import { type DataResponse, idSchema } from '@nba/dtos';
import { groupIdSchema, userIdSchema } from '@nba/dtos-groups';
import { YupPipe } from '@nba/frontend-api-common';
import {
  type GameScores,
  type MemberScores,
  ScoresService,
} from './scores.service';

// Internal: no auth, for whatever runs inside the deployment (nothing public may reach it).
@Controller()
export class ScoresController {
  constructor(private readonly scores: ScoresService) {}

  @Post('games/:gameId/score')
  @HttpCode(200)
  async score(
    @Param('gameId', new YupPipe(idSchema.required())) gameId: string,
  ): Promise<DataResponse<GameScores>> {
    return { data: await this.scores.score(gameId) };
  }

  @Post('groups/:groupId/users/:userId/score')
  @HttpCode(200)
  async scoreMember(
    @Param('groupId', new YupPipe(groupIdSchema)) groupId: string,
    @Param('userId', new YupPipe(userIdSchema)) userId: string,
  ): Promise<DataResponse<MemberScores>> {
    return { data: await this.scores.scoreMember(groupId, userId) };
  }
}
