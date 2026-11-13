import { Injectable } from '@nestjs/common';
import { upsertCounted, WriteCounts } from '@nba/sql-core';
import {
  GroupUserScoreCreateObject,
  GroupUserScoreEntity,
} from './group-user-score.entity';
import { GroupUserScoreRepo } from './group-user-score.repo';

@Injectable()
export class GroupUserScoreDalService {
  constructor(private readonly repo: GroupUserScoreRepo) {}

  // Made or replaced, by group, user and game.
  upsert(scores: GroupUserScoreCreateObject[]): Promise<WriteCounts> {
    return upsertCounted(this.repo.manager, GroupUserScoreEntity, scores, [
      'groupId',
      'userId',
      'gameId',
    ]);
  }

  findByGame(gameId: string): Promise<GroupUserScoreEntity[]> {
    return this.repo.find({ where: { gameId } });
  }
}
