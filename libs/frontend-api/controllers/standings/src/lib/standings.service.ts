import { Injectable } from '@nestjs/common';
import { StandingDto } from '@nba/dtos-standings';
import { StandingDalService, type StandingEntity } from '@nba/sql-standings';

export const toStandingDto = (standing: StandingEntity): StandingDto => ({
  season: standing.season,
  teamId: standing.teamId,
  conference: standing.conference,
  division: standing.division,
  gamesPlayed: standing.gamesPlayed,
  wins: standing.wins,
  losses: standing.losses,
  winPct: standing.winPct,
  gamesBehind: standing.gamesBehind,
  pointsFor: standing.pointsFor,
  pointsAgainst: standing.pointsAgainst,
  pointDifferential: standing.pointDifferential,
  streak: standing.streak,
  homeRecord: standing.homeRecord,
  awayRecord: standing.awayRecord,
  divisionRecord: standing.divisionRecord,
  conferenceRecord: standing.conferenceRecord,
  last10: standing.last10,
  leagueRank: standing.leagueRank,
  conferenceRank: standing.conferenceRank,
  divisionRank: standing.divisionRank,
  final: standing.final,
});

@Injectable()
export class StandingsService {
  constructor(private readonly standings: StandingDalService) {}

  // A season's, by league rank; empty for a season not fetched yet.
  async findBySeason(season: number): Promise<StandingDto[]> {
    return (await this.standings.findBySeason(season)).map(toStandingDto);
  }
}
