import { Controller, Get, Param, Query } from '@nestjs/common';
import { DataResponse, idSchema } from '@nba/dtos';
import { GameDto, GamesQuery, gamesQuerySchema } from '@nba/dtos-games';
import { YupPipe } from '@nba/frontend-api-common';
import { GamesService } from './games.service';

@Controller('games')
export class GamesController {
  constructor(private readonly games: GamesService) {}

  // The games listed on ?from= to ?to= (league days, US Eastern; at most MAX_GAME_DAYS), only a team's with ?teamId=;
  // or a team's season with ?season=&teamId=; or every game between two teams with ?teamId=&opponentId=.
  @Get()
  async find(
    @Query(new YupPipe(gamesQuerySchema)) query: GamesQuery,
  ): Promise<DataResponse<GameDto[]>> {
    return { data: await this.games.find(query) };
  }

  @Get(':id')
  async findOne(
    @Param('id', new YupPipe(idSchema.required())) id: string,
  ): Promise<DataResponse<GameDto>> {
    return { data: await this.games.findById(id) };
  }
}
