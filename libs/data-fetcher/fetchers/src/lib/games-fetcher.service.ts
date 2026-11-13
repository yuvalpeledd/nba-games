import { Injectable, Logger } from '@nestjs/common';
import {
  ApiNinjasClient,
  ApiNinjasError,
} from '@nba/data-fetcher-api-ninjas-client';
import { GameDalService } from '@nba/sql-games';
import { SeasonDalService, SeasonEntity } from '@nba/sql-seasons';
import { byDistanceFrom, daysBetween, easternDate } from './days';

const DEFAULT_MAX_REQUESTS = 50;

// A season's games, a day per request. Each run makes the task pool: every day of the season whose games we don't
// have yet, nearest to today first. Then it fetches them one at a time, up to GAMES_MAX_REQUESTS (the quota: the free
// plan's 100 an hour), and the next run picks up where it stopped.
//
// A day is done when it has games and, once it has come, all of them are over (final, postponed or canceled). So a
// future day is fetched once, for its schedule, and again from the day it's played until its results are in.
// ponytail: a day without games (Thanksgiving, the All-Star break) is never done, so every run asks for it again (a
// few requests a run). Keep the days fetched empty if that matters.
@Injectable()
export class GamesFetcherService {
  private readonly logger = new Logger(GamesFetcherService.name);

  constructor(
    private readonly client: ApiNinjasClient,
    private readonly games: GameDalService,
    private readonly seasons: SeasonDalService,
  ) {}

  async run(today = easternDate()): Promise<void> {
    const season = await this.season();
    const maxRequests = Number(
      process.env['GAMES_MAX_REQUESTS'] ?? DEFAULT_MAX_REQUESTS,
    );
    const pool = await this.pendingDays(season, today);

    let fetched = 0;
    const failed: string[] = [];
    for (const day of pool.slice(0, maxRequests)) {
      try {
        const games = await this.client.games(day);
        if (games.length) await this.games.upsert(games);
        fetched++;
      } catch (error) {
        if (error instanceof ApiNinjasError && error.status === 429) {
          this.logger.warn(`Quota reached at ${day}: the next run goes on`);
          break;
        }
        failed.push(day);
        this.logger.error(
          `${day}'s games failed: ${(error as Error).message}`,
          (error as Error).stack,
        );
      }
    }

    this.logger.log(
      `${season.id}: ${pool.length} days to fetch, ${fetched} fetched, ${failed.length} failed, ` +
        `${pool.length - fetched - failed.length} left for the next run`,
    );
    if (failed.length) throw new Error(`Games failed for ${failed.join(', ')}`);
  }

  // SEASON_ID, else the newest season.
  private async season(): Promise<SeasonEntity> {
    const id = process.env['SEASON_ID'];
    const season = id
      ? await this.seasons.findById(id)
      : (await this.seasons.findAll())[0];
    if (!season) {
      throw new Error(
        id
          ? `No season ${id} (SEASON_ID)`
          : 'No seasons: load one with a migration',
      );
    }
    return season;
  }

  private async pendingDays(
    season: SeasonEntity,
    today: string,
  ): Promise<string[]> {
    const over = await this.games.overByDate(season.startDate, season.endDate);
    return daysBetween(season.startDate, season.endDate)
      .filter((day) => !over.has(day) || (day <= today && !over.get(day)))
      .sort(byDistanceFrom(today));
  }
}
