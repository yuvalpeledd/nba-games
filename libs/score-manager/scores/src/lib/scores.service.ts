import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { isGameInGroupDates } from '@nba/dtos-groups';
import { scorePrediction } from '@nba/dtos-predictions';
import { ErrorCode } from '@nba/enums';
import { GameDalService, GameStatus } from '@nba/sql-games';
import { GroupGameScoreDalService } from '@nba/sql-group-game-score';
import { GroupMemberDalService } from '@nba/sql-group-members';
import { GroupUserScoreDalService } from '@nba/sql-group-user-score';
import { type GroupEntity, GroupDalService } from '@nba/sql-groups';
import { PredictionDalService } from '@nba/sql-predictions';

// What scoring a game wrote: a row per group of each user who picked, `right` of them right picks.
export interface GameScores {
  gameId: string;
  scores: number;
  right: number;
}

// What scoring members' picks in a group wrote: a row per final game they picked within its dates, `right` of them
// right picks.
export interface GroupScores {
  groupId: string;
  members: number;
  scores: number;
  right: number;
}

@Injectable()
export class ScoresService {
  private readonly logger = new Logger(ScoresService.name);

  constructor(
    private readonly games: GameDalService,
    private readonly predictions: PredictionDalService,
    private readonly groups: GroupDalService,
    private readonly members: GroupMemberDalService,
    private readonly groupUserScores: GroupUserScoreDalService,
    private readonly groupGameScores: GroupGameScoreDalService,
  ) {}

  // Every pick of a final game, scored in each group its user is in whose dates the game is within: the game's score
  // there (its owner's, else the group's defaultScore) if right, 0 if wrong; again overwrites.
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
    const groups = await this.groups.findByIds([
      ...new Set(memberships.map(({ groupId }) => groupId)),
    ]);
    const rows = memberships.flatMap(({ groupId, userId }) => {
      const group = groups.get(groupId);
      if (!group || !isGameInGroupDates(group, game)) return [];
      const score = right.get(userId)
        ? (gameScores.get(groupId) ?? group.defaultScore)
        : 0;
      return [{ groupId, userId, gameId, score }];
    });
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

  // A member's every pick of a final game within the group's dates, scored there (frontend-api asks when they join,
  // so their past games count there too); their other rows there go. 404 for a user who isn't in the group.
  async scoreMember(groupId: string, userId: string): Promise<GroupScores> {
    const memberships = await this.members.findByUsers([userId]);
    if (!memberships.some((membership) => membership.groupId === groupId)) {
      throw new NotFoundException(`User ${userId} is not in group ${groupId}`);
    }
    return this.rescore(await this.group(groupId), [userId]);
  }

  // Every member's, as scoreMember (frontend-api asks when the group's owner changes how it scores).
  async scoreGroup(groupId: string): Promise<GroupScores> {
    const group = await this.group(groupId);
    const members = await this.members.findMembers(groupId);
    return this.rescore(
      group,
      members.map(({ userId }) => userId),
    );
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

  private async group(groupId: string): Promise<GroupEntity> {
    const group = await this.groups.findById(groupId);
    if (!group) throw new NotFoundException(`Group ${groupId} not found`);
    return group;
  }

  // These members' scores in the group, made anew from their picks of final games within its dates.
  private async rescore(
    group: GroupEntity,
    userIds: string[],
  ): Promise<GroupScores> {
    const [predictions, gameScores] = await Promise.all([
      userIds.length ? this.predictions.findFinalByUsers(userIds) : [],
      this.groupGameScores.findByGroup(group.id),
    ]);
    const scoreOf = new Map(
      gameScores.map(({ gameId, score }) => [gameId, score]),
    );
    const scored = predictions.flatMap(({ userId, gameId, pick, game }) =>
      // findFinalByUsers loads the game.
      game && isGameInGroupDates(group, game)
        ? [{ userId, gameId, right: Boolean(scorePrediction({ pick }, game)) }]
        : [],
    );
    const rows = scored.map(({ userId, gameId, right }) => ({
      groupId: group.id,
      userId,
      gameId,
      score: right ? (scoreOf.get(gameId) ?? group.defaultScore) : 0,
    }));
    await this.groupUserScores.replace(group.id, userIds, rows);
    const result = {
      groupId: group.id,
      members: userIds.length,
      scores: rows.length,
      right: scored.filter(({ right }) => right).length,
    };
    this.logger.log(
      `Scored ${result.members} members in ${group.id}: ${result.scores} scores, ${result.right} right`,
    );
    return result;
  }
}
