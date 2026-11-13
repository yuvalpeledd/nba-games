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

  // The schema requires `from` without `season`, and `teamId` with it.
  async find({ from, to, season, teamId }: GamesQuery): Promise<GameDto[]> {
    const games =
      season === undefined
        ? await this.games.findBetween(
            from as string,
            to ?? (from as string),
            teamId,
          )
        : await this.games.findByTeamSeason(teamId as string, season);
    return games.map(toGameDto);
  }

  async findById(id: string): Promise<GameDto> {
    const game = await this.games.findById(id);
    if (!game) throw new NotFoundException(`Game ${id} not found`);
    return toGameDto(game);
  }
}
