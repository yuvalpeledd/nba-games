import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DEFAULT_GAME_SCORE } from '@nba/dtos-groups';
import { scorePrediction } from '@nba/dtos-predictions';
import { ErrorCode } from '@nba/enums';
import { GameDalService, GameStatus } from '@nba/sql-games';
import { GroupGameScoreDalService } from '@nba/sql-group-game-score';
import { GroupMemberDalService } from '@nba/sql-group-members';
import { GroupUserScoreDalService } from '@nba/sql-group-user-score';
import { PredictionDalService } from '@nba/sql-predictions';

// What scoring a game wrote: a row per group of each user who picked, `right` of them the game's score there.
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
    private readonly groupGameScores: GroupGameScoreDalService,
  ) {}

  // Every pick of a final game, scored in each group its user is in: the game's score there (its owner's, else
  // DEFAULT_GAME_SCORE) if right, 0 if wrong; again overwrites.
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
    const [memberships, gameScores] = await Promise.all([
      right.size ? this.members.findByUsers([...right.keys()]) : [],
      this.groupGameScores.findByGame(gameId),
    ]);
    const rows = memberships.map(({ groupId, userId }) => ({
      groupId,
      userId,
      gameId,
      score: right.get(userId)
        ? (gameScores.get(groupId) ?? DEFAULT_GAME_SCORE)
        : 0,
    }));
    await this.groupUserScores.upsert(rows);
    const result = {
      gameId,
      scores: rows.length,
      right: rows.filter(({ userId }) => right.get(userId)).length,
    };
    this.logger.log(
      `Scored ${gameId}: ${result.scores} scores, ${result.right} right`,
    );
    return result;
  }
}
