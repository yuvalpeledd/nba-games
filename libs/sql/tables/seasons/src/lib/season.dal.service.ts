import { Injectable } from '@nestjs/common';
import { LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { SeasonEntity } from './season.entity';
import { SeasonRepo } from './season.repo';

// Read-only: seasons are loaded by migrations.
@Injectable()
export class SeasonDalService {
  constructor(private readonly repo: SeasonRepo) {}

  // Newest first.
  findAll(): Promise<SeasonEntity[]> {
    return this.repo.find({ order: { startDate: 'DESC' } });
  }

  findById(id: string): Promise<SeasonEntity | null> {
    return this.repo.findOneBy({ id });
  }

  // The season a day ('YYYY-MM-DD') falls in, first and last days included; null between seasons.
  findByDate(date: string): Promise<SeasonEntity | null> {
    return this.repo.findOneBy({
      startDate: LessThanOrEqual(date),
      endDate: MoreThanOrEqual(date),
    });
  }
}
