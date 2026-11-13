import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { scorePrediction } from '@nba/dtos-predictions';
import { ErrorCode } from '@nba/enums';
import { GameDalService, GameStatus } from '@nba/sql-games';
import { GroupMemberDalService } from '@nba/sql-group-members';
import { GroupUserScoreDalService } from '@nba/sql-group-user-score';
import { PredictionDalService } from '@nba/sql-predictions';

// What scoring a game wrote: a row per group of each user who picked, `right` of them 1.
export interface GameScores {
  gameId: string;
  scores: number;
  right: number;
}

@Injectable()
export class ScoresService {
  private readonly logger = new Logger(ScoresService.name);

  constructor(
    private readonly games: GameDalService,
    private readonly predictions: PredictionDalService,
    private readonly members: GroupMemberDalService,
    private readonly groupUserScores: GroupUserScoreDalService,
  ) {}

  // Every pick of a final game, scored 1 (right) or 0 (wrong) in each group its user is in; again overwrites.
  // 404 for an unknown game, 409 until it's final with a winner (a canceled one never is: its picks are void).
  async score(gameId: string): Promise<GameScores> {
    const game = await this.games.findById(gameId);
    if (!game) throw new NotFoundException(`Game ${gameId} not found`);
    if (game.status !== GameStatus.FINAL || !game.winnerTeamId) {
      throw new ConflictException({
        statusCode: 409,
        message: `Game ${gameId} has no result to score (${game.status})`,
        code: ErrorCode.GAME_NOT_FINAL,
      });
    }
    const predictions = await this.predictions.findByGame(gameId);
    const right = new Map(
      predictions.map((prediction) => [
        prediction.userId,
        scorePrediction(prediction, game),
      ]),
    );
    const memberships = right.size
      ? await this.members.findByUsers([...right.keys()])
      : [];
    const rows = memberships.map(({ groupId, userId }) => ({
      groupId,
      userId,
      gameId,
      score: right.get(userId) ? 1 : 0,
    }));
    await this.groupUserScores.upsert(rows);
    const result = {
      gameId,
      scores: rows.length,
      right: rows.filter(({ score }) => score).length,
    };
    this.logger.log(
      `Scored ${gameId}: ${result.scores} scores, ${result.right} right`,
    );
    return result;
  }
}
