import { Injectable, Logger } from '@nestjs/common';
import {
  ApiNinjasClient,
  ApiNinjasError,
} from '@nba/data-fetcher-api-ninjas-client';
import { GameDayDalService } from '@nba/sql-game-days';
import { GameDalService } from '@nba/sql-games';
import { SeasonDalService, SeasonEntity } from '@nba/sql-seasons';
import { addWrites, describeWrites, NO_WRITES } from './counts';
import { byDistanceFrom, daysBetween, easternDate } from './days';

const DEFAULT_MAX_REQUESTS = 50;

// A season's games, a day per request. Each run makes the task pool, nearest to today first:
//  - the days never checked (no `game_days` row): the season's schedule, and its past the first time;
//  - the scores to update: every day from the last one with a scored game (the season's start if none has) to today,
//    so the games played since come back with their scores, and that day's late ones too. Not a day already found
//    empty on or after it (Thanksgiving, the All-Star break): it has no games to score. One found empty before it
//    came (a schedule not out yet) is checked again on its day.
// Then it fetches them one at a time, up to GAMES_MAX_REQUESTS (the quota: the free plan's 100 an hour), records each
// day fetched in `game_days` (empty ones too; a failed one isn't, so it's retried), and the next run picks up where
// it stopped.
@Injectable()
export class GamesFetcherService {
  private readonly logger = new Logger(GamesFetcherService.name);

  constructor(
    private readonly client: ApiNinjasClient,
    private readonly games: GameDalService,
    private readonly gameDays: GameDayDalService,
    private readonly seasons: SeasonDalService,
  ) {}

  async run(today = easternDate()): Promise<void> {
    const season = await this.season();
    const maxRequests = Number(
      process.env['GAMES_MAX_REQUESTS'] ?? DEFAULT_MAX_REQUESTS,
    );
    const { pool, neverChecked, scoresFrom } = await this.pendingDays(
      season,
      today,
    );
    const batch = pool.slice(0, maxRequests);
    this.logger.log(
      `${season.id}, today ${today}: ${pool.length} days to check (${neverChecked} never checked, ` +
        `${pool.length - neverChecked} for scores from ${scoresFrom}); checking ${batch.length} now ` +
        `(up to ${maxRequests} a run): ${batch.join(', ') || 'none'}`,
    );

    let fetched = 0;
    let total = NO_WRITES;
    const failed: string[] = [];
    for (const day of batch) {
      try {
        const games = await this.client.games(day);
        const written = await this.games.upsert(games);
        await this.gameDays.record([
          { date: day, games: games.length, checkedOn: today },
        ]);
        this.logger.log(
          games.length
            ? `${day}: fetched ${games.length} games from the API: ${describeWrites(written)}`
            : `${day}: fetched no games from the API`,
        );
        total = addWrites(total, written);
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
      `${season.id}: checked ${fetched} of ${pool.length} days (${failed.length} failed, ` +
        `${pool.length - fetched - failed.length} left for the next run); games ${describeWrites(total)}`,
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

  // The pool, nearest to today first, and why: how many were never checked (the rest are for their scores).
  private async pendingDays(
    season: SeasonEntity,
    today: string,
  ): Promise<{ pool: string[]; neverChecked: number; scoresFrom: string }> {
    const { startDate, endDate } = season;
    const checked = await this.gameDays.findBetween(startDate, endDate);
    const scoresFrom =
      (await this.games.lastScoredDate(startDate, endDate)) ?? startDate;
    const foundEmpty = (day: string) => {
      const check = checked.get(day);
      return check?.games === 0 && check.checkedOn >= day;
    };
    const pool = daysBetween(startDate, endDate)
      .filter(
        (day) =>
          !checked.has(day) ||
          (day >= scoresFrom && day <= today && !foundEmpty(day)),
      )
      .sort(byDistanceFrom(today));
    const neverChecked = pool.filter((day) => !checked.has(day)).length;
    return { pool, neverChecked, scoresFrom };
  }
}
