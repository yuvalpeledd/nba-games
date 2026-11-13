import { Injectable } from '@nestjs/common';
import { upsertCounted, WriteCounts } from '@nba/sql-core';
import { StandingCreateObject, StandingEntity } from '@nba/sql-standings';
import { StandingHistoryEntity } from './standing-history.entity';
import { StandingHistoryRepo } from './standing-history.repo';

// What recordStandings did, to each table.
export interface StandingsWritten {
  standings: WriteCounts;
  history: WriteCounts;
}

@Injectable()
export class StandingHistoryDalService {
  constructor(private readonly repo: StandingHistoryRepo) {}

  // A day's fetch of the standings, in one transaction (here: standings_history points at standings): `standings`
  // updated to them, and the day's history rows inserted, or updated by a later fetch the same day.
  async recordStandings(
    date: string,
    standings: StandingCreateObject[],
  ): Promise<StandingsWritten> {
    return this.repo.manager.transaction(async (manager) => ({
      standings: await upsertCounted(manager, StandingEntity, standings, [
        'season',
        'teamId',
      ]),
      history: await upsertCounted(
        manager,
        StandingHistoryEntity,
        standings.map((standing) => ({ ...standing, date })),
        ['date', 'season', 'teamId'],
      ),
    }));
  }

  // A team's standings over a season, a row a day, oldest first.
  findByTeam(season: number, teamId: string): Promise<StandingHistoryEntity[]> {
    return this.repo.find({
      where: { season, teamId },
      order: { date: 'ASC' },
    });
  }

  // The standings as they were on a day, in league order.
  findByDate(season: number, date: string): Promise<StandingHistoryEntity[]> {
    return this.repo.find({
      where: { season, date },
      order: { leagueRank: 'ASC' },
    });
  }
}
