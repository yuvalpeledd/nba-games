import { Injectable, Logger } from '@nestjs/common';
import { ApiNinjasClient } from '@nba/data-fetcher-api-ninjas-client';
import type { PlayerCreateObject } from '@nba/sql-players';
import { TeamPlayerDalService } from '@nba/sql-team-players';
import { TeamDalService } from '@nba/sql-teams';
import pMap from 'p-map';
import { fetchConcurrency } from './concurrency';
import {
  addWrites,
  describeWrites,
  NO_WRITES,
  type WriteCounts,
} from './counts';
import { easternDate } from './days';

// Every active team's roster (30 requests, FETCH_CONCURRENCY at a time), then all of them written at once for `today`:
// the players on their teams, anyone on no roster released, and today's team_players made what this run saw
// (replaceRosters). Writes nothing unless every roster came back: the first empty or failed one stops the run, since a
// missing one would release its whole team.
@Injectable()
export class PlayersFetcherService {
  private readonly logger = new Logger(PlayersFetcherService.name);

  constructor(
    private readonly client: ApiNinjasClient,
    private readonly teams: TeamDalService,
    private readonly teamPlayers: TeamPlayerDalService,
  ) {}

  async run(today = easternDate()): Promise<WriteCounts> {
    const teams = (await this.teams.findAll()).filter((team) => team.active);
    if (!teams.length)
      throw new Error('No teams: the teams fetcher runs first');

    const rosters = await pMap(
      teams,
      async (team) => {
        const roster = await this.client.players(team.id);
        if (!roster.length) {
          throw new Error(
            `${team.id}'s roster came back empty: nothing written`,
          );
        }
        this.logger.log(
          `Fetched ${roster.length} players of ${team.id} from the API`,
        );
        return roster;
      },
      { concurrency: fetchConcurrency() },
    );

    // By id, in the teams' order (pMap keeps it): a player on two rosters (traded between two requests) is written
    // once, on the later team.
    const players = new Map<string, PlayerCreateObject>();
    for (const player of rosters.flat()) players.set(player.id, player);

    const written = await this.teamPlayers.replaceRosters(today, [
      ...players.values(),
    ]);
    const { teamPlayers } = written;
    this.logger.log(
      `Fetched ${players.size} players on ${teams.length} rosters from the API: ` +
        `${describeWrites(written.players)}, ${written.players.released} released (on no roster now)`,
    );
    this.logger.log(
      `Rosters of ${today} (team_players): ${teamPlayers.inserted} added, ` +
        `${teamPlayers.deleted} deleted, ${teamPlayers.unchanged} unchanged`,
    );
    // The players only (a release is an update), as the scan counts them: the day's rosters are history.
    return addWrites(NO_WRITES, written.players);
  }
}
