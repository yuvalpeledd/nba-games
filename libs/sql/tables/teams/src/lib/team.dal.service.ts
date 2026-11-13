import { Injectable } from '@nestjs/common';
import { TeamCreateObject, TeamEntity } from './team.entity';
import { TeamRepo } from './team.repo';

@Injectable()
export class TeamDalService {
  constructor(private readonly repo: TeamRepo) {}

  // Inserts new teams and overwrites known ones (by the provider's id): reruns change nothing.
  async upsert(teams: TeamCreateObject[]): Promise<void> {
    await this.repo.upsert(teams, ['id']);
  }

  findAll(): Promise<TeamEntity[]> {
    return this.repo.find({ order: { name: 'ASC' } });
  }

  findById(id: string): Promise<TeamEntity | null> {
    return this.repo.findOneBy({ id });
  }
}
