import { Injectable } from '@nestjs/common';
import { GameStatus } from '../enums';
import { GameCreateObject, GameEntity } from './game.entity';
import { GameRepo } from './game.repo';

// A game in one of these has nothing left to fetch.
const OVER = [GameStatus.FINAL, GameStatus.POSTPONED, GameStatus.CANCELED];

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

  // Each day from `from` to `to` ('YYYY-MM-DD') that has games: true when all of them are over (final, postponed or
  // canceled). Days without games are left out.
  async overByDate(from: string, to: string): Promise<Map<string, boolean>> {
    const rows: { date: string; over: boolean }[] = await this.repo
      .createQueryBuilder('game')
      .select('game.date::text', 'date')
      .addSelect('bool_and(game.status IN (:...over))', 'over')
      .where('game.date BETWEEN :from AND :to', { from, to, over: OVER })
      .groupBy('game.date')
      .getRawMany();
    return new Map(rows.map(({ date, over }) => [date, over]));
  }
}
