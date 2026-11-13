import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { scorePrediction } from '@nba/dtos-predictions';
import { ErrorCode } from '@nba/enums';
import { NO_WRITES, type WriteCounts } from '@nba/sql-core';
import { GameDalService, GameStatus } from '@nba/sql-games';
import { GroupMemberDalService } from '@nba/sql-group-members';
import { GroupUserScoreDalService } from '@nba/sql-group-user-scores';
import { PredictionDalService } from '@nba/sql-predictions';

@Injectable()
export class ScoresService {
  private readonly logger = new Logger(ScoresService.name);

  constructor(
    private readonly games: GameDalService,
    private readonly predictions: PredictionDalService,
    private readonly members: GroupMemberDalService,
    private readonly scores: GroupUserScoreDalService,
  ) {}

  // Scores every pick of the final game in each of its user's groups: 1 if right, 0 if wrong (scorePrediction).
  // A user who made no pick (or took it back) gets no row. Checking again rewrites only what changed.
  async check(gameId: string): Promise<WriteCounts> {
    const game = await this.games.findById(gameId);
    if (!game) throw new NotFoundException(`Game ${gameId} not found`);
    if (game.status !== GameStatus.FINAL || !game.winnerTeamId) {
      throw new ConflictException({
        statusCode: 409,
        message: `Game ${gameId} is ${game.status} without a winner: nothing to score`,
        code: ErrorCode.GAME_NOT_FINAL,
      });
    }
    const scoreOf = new Map<string, number>();
    for (const prediction of await this.predictions.findByGame(gameId)) {
      const right = scorePrediction(prediction, game);
      if (right !== null) scoreOf.set(prediction.userId, right ? 1 : 0);
    }
    const memberships = scoreOf.size
      ? await this.members.findByUsers([...scoreOf.keys()])
      : [];
    const counts = memberships.length
      ? await this.scores.upsert(
          memberships.map(({ groupId, userId }) => ({
            groupId,
            userId,
            gameId,
            score: scoreOf.get(userId) ?? 0,
          })),
        )
      : NO_WRITES;
    this.logger.log(
      `Checked ${gameId}: ${scoreOf.size} picks, ${counts.inserted} scores inserted, ${counts.updated} updated, ${counts.unchanged} unchanged`,
    );
    return counts;
  }
}
