import { Injectable } from '@nestjs/common';
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
