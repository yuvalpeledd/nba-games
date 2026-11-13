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

// What scoring a member's picks in a group wrote: a row per final game they picked, `right` of them the game's score
// there.
export interface MemberScores {
  groupId: string;
  userId: string;
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

  // A member's every pick of a final game, scored in the group (frontend-api asks when they join, so their past
  // games count there too); again overwrites. 404 for a user who isn't in the group.
  async scoreMember(groupId: string, userId: string): Promise<MemberScores> {
    const memberships = await this.members.findByUsers([userId]);
    if (!memberships.some((membership) => membership.groupId === groupId)) {
      throw new NotFoundException(`User ${userId} is not in group ${groupId}`);
    }
    const [predictions, gameScores] = await Promise.all([
      this.predictions.findFinalByUser(userId),
      this.groupGameScores.findByGroup(groupId),
    ]);
    const scoreOf = new Map(
      gameScores.map(({ gameId, score }) => [gameId, score]),
    );
    const scored = predictions.map((prediction) => ({
      gameId: prediction.gameId,
      // findFinalByUser loads the game.
      right: Boolean(
        prediction.game && scorePrediction(prediction, prediction.game),
      ),
    }));
    const rows = scored.map(({ gameId, right }) => ({
      groupId,
      userId,
      gameId,
      score: right ? (scoreOf.get(gameId) ?? DEFAULT_GAME_SCORE) : 0,
    }));
    await this.groupUserScores.upsert(rows);
    const result = {
      groupId,
      userId,
      scores: rows.length,
      right: scored.filter(({ right }) => right).length,
    };
    this.logger.log(
      `Scored ${userId} in ${groupId}: ${result.scores} scores, ${result.right} right`,
    );
    return result;
  }

  // Every game from `from` to `to` ('YYYY-MM-DD', both included) that's final with a winner, scored as `score` does;
  // the rest (not played yet, canceled) are skipped.
  // ponytail: one game at a time (a season is ~1,300); batch the reads if a whole season gets slow.
  async scoreBetween(from: string, to: string): Promise<GameScores[]> {
    const games = await this.games.findBetween(from, to);
    const results: GameScores[] = [];
    for (const game of games) {
      if (game.status === GameStatus.FINAL && game.winnerTeamId) {
        results.push(await this.score(game.id));
      }
    }
    this.logger.log(
      `Scored ${results.length} of ${games.length} games from ${from} to ${to}`,
    );
    return results;
  }
}
