import { Injectable, Logger } from '@nestjs/common';
import { ApiNinjasClient } from '@nba/data-fetcher-api-ninjas-client';
import type { PlayerCreateObject } from '@nba/sql-players';
import { TeamPlayerDalService } from '@nba/sql-team-players';
import { TeamDalService } from '@nba/sql-teams';
import { easternDate } from './days';

// Every active team's roster, one request at a time (30), then all of them written at once for `today`: the players
// on their teams, anyone on no roster released, and today's team_players replaced (replaceRosters). Writes nothing
// unless every roster came back, since a missing one would release its whole team.
@Injectable()
export class PlayersFetcherService {
  private readonly logger = new Logger(PlayersFetcherService.name);

  constructor(
    private readonly client: ApiNinjasClient,
    private readonly teams: TeamDalService,
    private readonly teamPlayers: TeamPlayerDalService,
  ) {}

  async run(today = easternDate()): Promise<void> {
    const teams = (await this.teams.findAll()).filter((team) => team.active);
    if (!teams.length)
      throw new Error('No teams: the teams fetcher runs first');

    // By id: a player listed twice (traded between two requests) is written once, on the later team.
    const players = new Map<string, PlayerCreateObject>();
    for (const team of teams) {
      const roster = await this.client.players(team.id);
      if (!roster.length) {
        throw new Error(`${team.id}'s roster came back empty: nothing written`);
      }
      for (const player of roster) players.set(player.id, player);
    }

    await this.teamPlayers.replaceRosters(today, [...players.values()]);
    this.logger.log(
      `${players.size} players on ${teams.length} rosters written for ${today}`,
    );
  }
}
