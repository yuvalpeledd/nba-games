import { Injectable } from '@nestjs/common';
import { Between } from 'typeorm';
import { GameDayCreateObject, GameDayEntity } from './game-day.entity';
import { GameDayRepo } from './game-day.repo';

@Injectable()
export class GameDayDalService {
  constructor(private readonly repo: GameDayRepo) {}

  // Records checked days; a day checked again gets its new count and date.
  async record(days: GameDayCreateObject[]): Promise<void> {
    await this.repo.upsert(days, ['date']);
  }

  // The checked days from `from` to `to` ('YYYY-MM-DD'), by date.
  async findBetween(
    from: string,
    to: string,
  ): Promise<Map<string, GameDayEntity>> {
    const days = await this.repo.find({ where: { date: Between(from, to) } });
    return new Map(days.map((day) => [day.date, day]));
  }
}
