import { Injectable } from '@nestjs/common';
import {
  GroupGameScoreCreateObject,
  GroupGameScoreEntity,
} from './group-game-score.entity';
import { GroupGameScoreRepo } from './group-game-score.repo';

@Injectable()
export class GroupGameScoreDalService {
  constructor(private readonly repo: GroupGameScoreRepo) {}

  // Made or replaced (by group and game).
  async set(score: GroupGameScoreCreateObject): Promise<GroupGameScoreEntity> {
    await this.repo.upsert(score, ['groupId', 'gameId']);
    return this.repo.findOneByOrFail({
      groupId: score.groupId,
      gameId: score.gameId,
    });
  }

  // A group's game scores (only the games its owner set).
  findByGroup(groupId: string): Promise<GroupGameScoreEntity[]> {
    return this.repo.find({ where: { groupId }, order: { gameId: 'ASC' } });
  }

  // A game's score in each group that set one, by group id.
  async findByGame(gameId: string): Promise<Map<string, number>> {
    const rows = await this.repo.find({ where: { gameId } });
    return new Map(rows.map((row) => [row.groupId, row.score]));
  }
}
