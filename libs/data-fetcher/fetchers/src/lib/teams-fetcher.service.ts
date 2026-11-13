import { Injectable, Logger } from '@nestjs/common';
import { ApiNinjasClient } from '@nba/data-fetcher-api-ninjas-client';
import { TeamDalService } from '@nba/sql-teams';
import { describeWrites } from './counts';

// Every team, in one request. Teams are never deleted (games, players and standings point at them): one the provider
// stops listing keeps its row.
@Injectable()
export class TeamsFetcherService {
  private readonly logger = new Logger(TeamsFetcherService.name);

  constructor(
    private readonly client: ApiNinjasClient,
    private readonly teams: TeamDalService,
  ) {}

  async run(): Promise<void> {
    const teams = await this.client.teams();
    if (!teams.length) throw new Error('No teams came back: nothing written');
    const written = await this.teams.upsert(teams);
    this.logger.log(
      `Fetched ${teams.length} teams from the API: ${describeWrites(written)}`,
    );
  }
}
