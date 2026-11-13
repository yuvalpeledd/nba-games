import { InferType, number, object } from 'yup';

export interface StandingDto {
  // The year it starts in: 2026 is 2026-27.
  season: number;
  teamId: string;
  conference: string;
  division: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  winPct: number;
  gamesBehind: number;
  pointsFor: number;
  pointsAgainst: number;
  pointDifferential: number;
  // As the provider writes them: `W7`, `5-1`.
  streak: string;
  homeRecord: string;
  awayRecord: string;
  divisionRecord: string;
  conferenceRecord: string;
  last10: string;
  leagueRank: number;
  // The playoff seed.
  conferenceRank: number;
  divisionRank: number;
  // The season is over: these are its final standings.
  final: boolean;
}

// GET /standings: a season's, by its year (SeasonDto.year).
export const standingsQuerySchema = object({
  season: number().integer().min(1946).max(2100).required(),
});
export type StandingsQuery = InferType<typeof standingsQuerySchema>;
