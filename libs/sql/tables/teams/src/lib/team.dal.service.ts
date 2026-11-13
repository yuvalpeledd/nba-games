import { Injectable } from '@nestjs/common';
import { upsertCounted, WriteCounts } from '@nba/sql-core';
import { TeamCreateObject, TeamEntity } from './team.entity';
import { TeamRepo } from './team.repo';

@Injectable()
export class TeamDalService {
  constructor(private readonly repo: TeamRepo) {}

  // Inserts new teams and updates the known ones that changed (by the provider's id): reruns change nothing.
  async upsert(teams: TeamCreateObject[]): Promise<WriteCounts> {
    return upsertCounted(this.repo.manager, TeamEntity, teams, ['id']);
  }

  findAll(): Promise<TeamEntity[]> {
    return this.repo.find({ order: { name: 'ASC' } });
  }

  findById(id: string): Promise<TeamEntity | null> {
    return this.repo.findOneBy({ id });
  }
}
