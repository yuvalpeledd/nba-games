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
}
