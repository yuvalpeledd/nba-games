import { Controller, Get, Query } from '@nestjs/common';
import { DataResponse } from '@nba/dtos';
import {
  StandingDto,
  StandingsQuery,
  standingsQuerySchema,
} from '@nba/dtos-standings';
import { YupPipe } from '@nba/frontend-api-common';
import { StandingsService } from './standings.service';

@Controller('standings')
export class StandingsController {
  constructor(private readonly standings: StandingsService) {}

  // ?season=<year> (2026 is 2026-27, SeasonDto.year).
  @Get()
  async findBySeason(
    @Query(new YupPipe(standingsQuerySchema)) { season }: StandingsQuery,
  ): Promise<DataResponse<StandingDto[]>> {
    return { data: await this.standings.findBySeason(season) };
  }
}
