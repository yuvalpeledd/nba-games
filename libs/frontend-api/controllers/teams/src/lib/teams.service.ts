import { Injectable, NotFoundException } from '@nestjs/common';
import { TeamDto } from '@nba/dtos-teams';
import { TeamDalService, type TeamEntity } from '@nba/sql-teams';

export const toTeamDto = (team: TeamEntity): TeamDto => ({
  id: team.id,
  abbreviation: team.abbreviation,
  name: team.name,
  nickname: team.nickname,
  city: team.city,
  conference: team.conference,
  division: team.division,
  venue: team.venue,
  active: team.active,
});

@Injectable()
export class TeamsService {
  constructor(private readonly teams: TeamDalService) {}

  // By name, past franchises included (`active` false).
  async findAll(): Promise<TeamDto[]> {
    return (await this.teams.findAll()).map(toTeamDto);
  }

  async findById(id: string): Promise<TeamDto> {
    const team = await this.teams.findById(id);
    if (!team) throw new NotFoundException(`Team ${id} not found`);
    return toTeamDto(team);
  }
}
