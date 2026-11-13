import { Injectable } from '@nestjs/common';
import { Between } from 'typeorm';
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

  findById(id: string): Promise<GameEntity | null> {
    return this.repo.findOneBy({ id });
  }
}
