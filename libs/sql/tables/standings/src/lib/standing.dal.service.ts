import { Injectable } from '@nestjs/common';
import { upsertCounted, WriteCounts } from '@nba/sql-core';
import { StandingCreateObject, StandingEntity } from './standing.entity';
import { StandingRepo } from './standing.repo';

@Injectable()
export class StandingDalService {
  constructor(private readonly repo: StandingRepo) {}

  // Inserts new rows and updates the known ones that changed (by season and team): reruns change nothing.
  async upsert(standings: StandingCreateObject[]): Promise<WriteCounts> {
    return upsertCounted(this.repo.manager, StandingEntity, standings, [
      'season',
      'teamId',
    ]);
  }

  findBySeason(season: number): Promise<StandingEntity[]> {
    return this.repo.find({ where: { season }, order: { leagueRank: 'ASC' } });
  }
}
