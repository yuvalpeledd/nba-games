import { Injectable } from '@nestjs/common';
import { GameCreateObject, GameEntity } from './game.entity';
import { GameRepo } from './game.repo';

@Injectable()
export class GameDalService {
  constructor(private readonly repo: GameRepo) {}

  // Inserts new games and overwrites known ones (by the provider's id): a score, a status, a new date.
  async upsert(games: GameCreateObject[]): Promise<void> {
    await this.repo.upsert(games, ['id']);
  }

  // A day's games ('YYYY-MM-DD', the league's US Eastern day), in tip-off order.
  findByDate(date: string): Promise<GameEntity[]> {
    return this.repo.find({
      where: { date },
      order: { startTime: 'ASC', id: 'ASC' },
    });
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
