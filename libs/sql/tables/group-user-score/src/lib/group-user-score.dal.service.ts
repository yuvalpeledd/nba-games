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
}
