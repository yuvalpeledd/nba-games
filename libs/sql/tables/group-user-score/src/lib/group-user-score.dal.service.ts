import { Injectable } from '@nestjs/common';
import { In } from 'typeorm';
import {
  GroupUserScoreCreateObject,
  GroupUserScoreEntity,
} from './group-user-score.entity';
import { GroupUserScoreRepo } from './group-user-score.repo';

@Injectable()
export class GroupUserScoreDalService {
  constructor(private readonly repo: GroupUserScoreRepo) {}

  // Made or replaced (by group, user and game), so scoring a game again overwrites its scores.
  async upsert(scores: GroupUserScoreCreateObject[]): Promise<void> {
    if (scores.length) {
      await this.repo.upsert(scores, ['groupId', 'userId', 'gameId']);
    }
  }

  // These users' scores in a group become `scores` (every other row of theirs there goes), in one transaction: a
  // rescore after the group's settings change leaves no game they no longer score.
  async replace(
    groupId: string,
    userIds: string[],
    scores: GroupUserScoreCreateObject[],
  ): Promise<void> {
    if (!userIds.length) return;
    await this.repo.manager.transaction(async (manager) => {
      await manager.delete(GroupUserScoreEntity, {
        groupId,
        userId: In(userIds),
      });
      if (scores.length) await manager.insert(GroupUserScoreEntity, scores);
    });
  }

  // A game's scores, in every group.
  findByGame(gameId: string): Promise<GroupUserScoreEntity[]> {
    return this.repo.find({ where: { gameId } });
  }

  // Each user's total in a group (every game scored there), by user id; a user with no scores isn't in it.
  async totalsByGroup(groupId: string): Promise<Map<string, number>> {
    const rows: { user_id: string; total: string }[] = await this.repo
      .createQueryBuilder('s')
      .select('s.user_id', 'user_id')
      .addSelect('SUM(s.score)', 'total')
      .where('s.group_id = :groupId', { groupId })
      .groupBy('s.user_id')
      .getRawMany();
    return new Map(rows.map((row) => [row.user_id, Number(row.total)]));
  }
}
