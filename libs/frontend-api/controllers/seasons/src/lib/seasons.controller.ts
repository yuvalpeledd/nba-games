import { Controller, Get } from '@nestjs/common';
import { DataResponse } from '@nba/dtos';
import { SeasonDto } from '@nba/dtos-seasons';
import { SeasonsService } from './seasons.service';

@Controller('seasons')
export class SeasonsController {
  constructor(private readonly seasons: SeasonsService) {}

  @Get()
  async findAll(): Promise<DataResponse<SeasonDto[]>> {
    return { data: await this.seasons.findAll() };
  }
}
