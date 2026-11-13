import { Injectable, NotFoundException } from '@nestjs/common';
import { PlayerDto, PlayersQuery, PlayerTeamDto } from '@nba/dtos-players';
import { PlayerDalService, type PlayerEntity } from '@nba/sql-players';
import { TeamPlayerDalService } from '@nba/sql-team-players';

export const toPlayerDto = (player: PlayerEntity): PlayerDto => ({
  id: player.id,
  teamId: player.teamId,
  name: player.name,
  firstName: player.firstName,
  lastName: player.lastName,
  position: player.position,
  jerseyNumber: player.jerseyNumber,
  heightIn: player.heightIn,
  weightLb: player.weightLb,
  birthDate: player.birthDate,
  birthPlace: player.birthPlace,
  rosterStatus: player.rosterStatus,
  college: player.college,
  experienceYears: player.experienceYears,
});

@Injectable()
export class PlayersService {
  constructor(
    private readonly players: PlayerDalService,
    private readonly teamPlayers: TeamPlayerDalService,
  ) {}

  async findPage(query: PlayersQuery): Promise<PlayerDto[]> {
    return (await this.players.findPage(query)).map(toPlayerDto);
  }

  async findById(id: string): Promise<PlayerDto> {
    const player = await this.players.findById(id);
    if (!player) throw new NotFoundException(`Player ${id} not found`);
    return toPlayerDto(player);
  }

  // The teams the player was on, by the first day seen on each.
  // ponytail: one span per team, its first to last day: a player who leaves a team and comes back shows one span
  // across the gap. Split on the days between when a "traded on" view needs it.
  async findTeams(id: string): Promise<PlayerTeamDto[]> {
    await this.findById(id);
    const spans = new Map<string, PlayerTeamDto>();
    for (const { teamId, date } of await this.teamPlayers.findByPlayerId(id)) {
      const span = spans.get(teamId);
      if (span) span.to = date;
      else spans.set(teamId, { teamId, from: date, to: date });
    }
    return [...spans.values()];
  }
}
