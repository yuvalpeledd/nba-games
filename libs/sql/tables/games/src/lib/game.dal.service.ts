import { Injectable } from '@nestjs/common';
import { upsertCounted, WriteCounts } from '@nba/sql-core';
import { Between } from 'typeorm';
import { GameCreateObject, GameEntity } from './game.entity';
import { GameRepo } from './game.repo';

@Injectable()
export class GameDalService {
  constructor(private readonly repo: GameRepo) {}

  // Inserts new games and updates the known ones that changed (by the provider's id): a score, a status, a new date.
  async upsert(games: GameCreateObject[]): Promise<WriteCounts> {
    return upsertCounted(this.repo.manager, GameEntity, games, ['id']);
  }

  // A day's games ('YYYY-MM-DD', the league's US Eastern day), in tip-off order.
  findByDate(date: string): Promise<GameEntity[]> {
    return this.repo.find({
      where: { date },
      order: { startTime: 'ASC', id: 'ASC' },
    });
  }

  // The games from `from` to `to` ('YYYY-MM-DD', both included), only a team's (home or away) when `teamId` is given;
  // by day, then tip-off.
  findBetween(
    from: string,
    to: string,
    teamId?: string,
  ): Promise<GameEntity[]> {
    const date = Between(from, to);
    return this.repo.find({
      where: teamId
        ? [
            { date, homeTeamId: teamId },
            { date, awayTeamId: teamId },
          ]
        : { date },
      order: { date: 'ASC', startTime: 'ASC', id: 'ASC' },
    });
  }

  // A team's games (home or away) in a season (the year it starts in), every type; by day, then tip-off.
  findByTeamSeason(teamId: string, season: number): Promise<GameEntity[]> {
    return this.repo.find({
      where: [
        { season, homeTeamId: teamId },
        { season, awayTeamId: teamId },
      ],
      order: { date: 'ASC', startTime: 'ASC', id: 'ASC' },
    });
  }

  findById(id: string): Promise<GameEntity | null> {
    return this.repo.findOneBy({ id });
  }

  // The last day from `from` to `to` with a game that has its score; null when none has.
  async lastScoredDate(from: string, to: string): Promise<string | null> {
    const row: { date: string | null } | undefined = await this.repo
      .createQueryBuilder('game')
      .select('MAX(game.date)::text', 'date')
      .where('game.date BETWEEN :from AND :to', { from, to })
      .andWhere('game.home_score IS NOT NULL')
      .getRawOne();
    return row?.date ?? null;
  }
}
