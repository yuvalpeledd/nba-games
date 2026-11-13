import { Injectable } from '@nestjs/common';
import { SeasonDto } from '@nba/dtos-seasons';
import { SeasonDalService, type SeasonEntity } from '@nba/sql-seasons';

export const toSeasonDto = (season: SeasonEntity): SeasonDto => ({
  id: season.id,
  name: season.name,
  year: Number(season.startDate.slice(0, 4)),
  startDate: season.startDate,
  endDate: season.endDate,
});

@Injectable()
export class SeasonsService {
  constructor(private readonly seasons: SeasonDalService) {}

  // Newest first.
  async findAll(): Promise<SeasonDto[]> {
    return (await this.seasons.findAll()).map(toSeasonDto);
  }
}
