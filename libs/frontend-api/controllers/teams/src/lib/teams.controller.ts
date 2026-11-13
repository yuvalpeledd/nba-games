import { Controller, Get, Param } from '@nestjs/common';
import { DataResponse, idSchema } from '@nba/dtos';
import { TeamDto } from '@nba/dtos-teams';
import { YupPipe } from '@nba/frontend-api-common';
import { TeamsService } from './teams.service';

@Controller('teams')
export class TeamsController {
  constructor(private readonly teams: TeamsService) {}

  @Get()
  async findAll(): Promise<DataResponse<TeamDto[]>> {
    return { data: await this.teams.findAll() };
  }

  @Get(':id')
  async findOne(
    @Param('id', new YupPipe(idSchema.required())) id: string,
  ): Promise<DataResponse<TeamDto>> {
    return { data: await this.teams.findById(id) };
  }
}
