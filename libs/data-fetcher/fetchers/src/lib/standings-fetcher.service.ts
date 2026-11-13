import { Injectable, Logger } from '@nestjs/common';
import { ApiNinjasClient } from '@nba/data-fetcher-api-ninjas-client';
import { StandingHistoryDalService } from '@nba/sql-standings-history';
import { describeWrites } from './counts';
import { easternDate } from './days';

// The current season's standings, in one request: `standings` updated to them, and `today`'s row in
// `standings_history` for each team (a later run the same day updates it).
@Injectable()
export class StandingsFetcherService {
  private readonly logger = new Logger(StandingsFetcherService.name);

  constructor(
    private readonly client: ApiNinjasClient,
    private readonly history: StandingHistoryDalService,
  ) {}

  async run(today = easternDate()): Promise<void> {
    const standings = await this.client.standings();
    if (!standings.length) {
      this.logger.warn('Fetched no standings from the API: nothing written');
      return;
    }
    const written = await this.history.recordStandings(today, standings);
    this.logger.log(
      `Fetched ${standings.length} standings from the API: ${describeWrites(written.standings)}; ` +
        `history of ${today}: ${describeWrites(written.history)}`,
    );
  }
}
