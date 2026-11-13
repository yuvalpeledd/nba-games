import { Injectable } from '@nestjs/common';
import { TeamPlayerCreateObject, TeamPlayerEntity } from './team-player.entity';
import { TeamPlayerRepo } from './team-player.repo';

@Injectable()
export class TeamPlayerDalService {
  constructor(private readonly repo: TeamPlayerRepo) {}

  // Records a day's rosters; a day already recorded changes nothing.
  async upsert(rows: TeamPlayerCreateObject[]): Promise<void> {
    await this.repo.upsert(rows, ['date', 'teamId', 'playerId']);
  }

  // A player's days, oldest first: which team they were on, and when.
  findByPlayerId(playerId: string): Promise<TeamPlayerEntity[]> {
    return this.repo.find({
      where: { playerId },
      order: { date: 'ASC', teamId: 'ASC' },
    });
  }

  // A team's roster on a day ('YYYY-MM-DD').
  findByTeamIdAndDate(
    teamId: string,
    date: string,
  ): Promise<TeamPlayerEntity[]> {
    return this.repo.find({
      where: { teamId, date },
      order: { playerId: 'ASC' },
    });
  }
}
