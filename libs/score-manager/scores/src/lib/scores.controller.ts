import { Controller, HttpCode, Param, Post, Query } from '@nestjs/common';
import { type DataResponse, daySchema, idSchema } from '@nba/dtos';
import { groupIdSchema, userIdSchema } from '@nba/dtos-groups';
import { YupPipe } from '@nba/frontend-api-common';
import { type InferType, object } from 'yup';
import {
  type GameScores,
  type GroupScores,
  ScoresService,
} from './scores.service';

// POST /games/score: the days from `from` to `to`, both included.
// ponytail: score-manager's only range, so its schema stays here, not in a dtos lib nothing else imports.
const rangeQuerySchema = object({
  from: daySchema.required(),
  to: daySchema
    .required()
    .test(
      'not-before-from',
      'to must not be before from',
      (to, { parent }) =>
        !daySchema.isValidSync(parent.from) || to >= parent.from,
    ),
});
type RangeQuery = InferType<typeof rangeQuerySchema>;

// Internal: no auth, for whatever runs inside the deployment (nothing public may reach it).
@Controller()
export class ScoresController {
  constructor(private readonly scores: ScoresService) {}

  @Post('games/score')
  @HttpCode(200)
  async scoreBetween(
    @Query(new YupPipe(rangeQuerySchema)) { from, to }: RangeQuery,
  ): Promise<DataResponse<GameScores[]>> {
    return { data: await this.scores.scoreBetween(from, to) };
  }

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
  ): Promise<DataResponse<GroupScores>> {
    return { data: await this.scores.scoreMember(groupId, userId) };
  }

  @Post('groups/:groupId/score')
  @HttpCode(200)
  async scoreGroup(
    @Param('groupId', new YupPipe(groupIdSchema)) groupId: string,
  ): Promise<DataResponse<GroupScores>> {
    return { data: await this.scores.scoreGroup(groupId) };
  }
}
