import { Injectable, NotFoundException } from '@nestjs/common';
import { GameDto, GamesQuery } from '@nba/dtos-games';
import { GameDalService, type GameEntity } from '@nba/sql-games';

export const toGameDto = (game: GameEntity): GameDto => ({
  id: game.id,
  season: game.season,
  seasonType: game.seasonType,
  date: game.date,
  startTime: game.startTime.toISOString(),
  status: game.status,
  statusDetail: game.statusDetail,
  period: game.period,
  clock: game.clock,
  homeTeamId: game.homeTeamId,
  awayTeamId: game.awayTeamId,
  homeScore: game.homeScore,
  awayScore: game.awayScore,
  periodScores: game.periodScores,
  decidedIn: game.decidedIn,
  winnerTeamId: game.winnerTeamId,
  venue: game.venue,
  neutralSite: game.neutralSite,
  originalDate: game.originalDate,
});

@Injectable()
export class GamesService {
  constructor(private readonly games: GameDalService) {}

  async findBetween({ from, to, teamId }: GamesQuery): Promise<GameDto[]> {
    return (await this.games.findBetween(from, to ?? from, teamId)).map(
      toGameDto,
    );
  }

  async findById(id: string): Promise<GameDto> {
    const game = await this.games.findById(id);
    if (!game) throw new NotFoundException(`Game ${id} not found`);
    return toGameDto(game);
  }
}
