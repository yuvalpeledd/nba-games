import { Injectable, Logger } from '@nestjs/common';
import { ApiNinjasClient } from '@nba/data-fetcher-api-ninjas-client';
import { StandingDalService } from '@nba/sql-standings';

// The current season's standings, in one request, over the season's earlier ones.
@Injectable()
export class StandingsFetcherService {
  private readonly logger = new Logger(StandingsFetcherService.name);

  constructor(
    private readonly client: ApiNinjasClient,
    private readonly standings: StandingDalService,
  ) {}

  async run(): Promise<void> {
    const standings = await this.client.standings();
    if (standings.length) await this.standings.upsert(standings);
    this.logger.log(`${standings.length} standings written`);
  }
}
