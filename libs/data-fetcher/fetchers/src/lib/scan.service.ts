import { Injectable, Logger } from '@nestjs/common';
import { ScanDalService } from '@nba/sql-scans';
import { addWrites, NO_WRITES } from './counts';
import { GamesFetcherService } from './games-fetcher.service';
import { PlayersFetcherService } from './players-fetcher.service';
import { StandingsFetcherService } from './standings-fetcher.service';
import { TeamsFetcherService } from './teams-fetcher.service';

// One run (data-fetcher.md): every fetcher in this order (the players and the games need the teams), then a row in
// `scans` saying how it went. A failure doesn't stop the fetchers after it.
@Injectable()
export class ScanService {
  private readonly logger = new Logger(ScanService.name);

  constructor(
    private readonly scans: ScanDalService,
    private readonly teams: TeamsFetcherService,
    private readonly players: PlayersFetcherService,
    private readonly standings: StandingsFetcherService,
    private readonly games: GamesFetcherService,
  ) {}

  // Whether every fetcher succeeded.
  async run(): Promise<boolean> {
    const startedAt = new Date();
    let total = NO_WRITES;
    const errors: string[] = [];
    for (const fetcher of [
      this.teams,
      this.players,
      this.standings,
      this.games,
    ]) {
      const { name } = fetcher.constructor;
      const started = Date.now();
      try {
        total = addWrites(total, await fetcher.run());
        this.logger.log(`${name} done in ${Date.now() - started} ms`);
      } catch (error) {
        errors.push(`${name}: ${(error as Error).message}`);
        this.logger.error(
          `${name} failed: ${(error as Error).message}`,
          (error as Error).stack,
        );
      }
    }
    await this.scans.record({
      startedAt,
      finishedAt: new Date(),
      success: !errors.length,
      ...total,
      error: errors.join('\n') || null,
    });
    return !errors.length;
  }
}
