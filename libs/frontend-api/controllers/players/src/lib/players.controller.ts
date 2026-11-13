import { Controller, Get, Param, Query } from '@nestjs/common';
import { DataResponse, idSchema } from '@nba/dtos';
import {
  PlayerDto,
  PlayersQuery,
  playersQuerySchema,
  PlayerTeamDto,
} from '@nba/dtos-players';
import { YupPipe } from '@nba/frontend-api-common';
import { PlayersService } from './players.service';

@Controller('players')
export class PlayersController {
  constructor(private readonly players: PlayersService) {}

  // By name, a page at a time (?limit=&offset=), only a team's with ?teamId= (its current roster).
  @Get()
  async findPage(
    @Query(new YupPipe(playersQuerySchema)) query: PlayersQuery,
  ): Promise<DataResponse<PlayerDto[]>> {
    return { data: await this.players.findPage(query) };
  }

  @Get(':id')
  async findOne(
    @Param('id', new YupPipe(idSchema.required())) id: string,
  ): Promise<DataResponse<PlayerDto>> {
    return { data: await this.players.findById(id) };
  }

  // Which teams the player was on, and when (from the daily rosters).
  @Get(':id/teams')
  async findTeams(
    @Param('id', new YupPipe(idSchema.required())) id: string,
  ): Promise<DataResponse<PlayerTeamDto[]>> {
    return { data: await this.players.findTeams(id) };
  }
}
