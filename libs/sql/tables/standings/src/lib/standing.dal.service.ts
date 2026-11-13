import { Injectable } from '@nestjs/common';
import { StandingCreateObject, StandingEntity } from './standing.entity';
import { StandingRepo } from './standing.repo';

@Injectable()
export class StandingDalService {
  constructor(private readonly repo: StandingRepo) {}

  // Inserts new rows and overwrites known ones (by season and team): reruns change nothing.
  async upsert(standings: StandingCreateObject[]): Promise<void> {
    await this.repo.upsert(standings, ['season', 'teamId']);
  }

  findBySeason(season: number): Promise<StandingEntity[]> {
    return this.repo.find({ where: { season }, order: { leagueRank: 'ASC' } });
  }
}
