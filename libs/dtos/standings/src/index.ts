// GET /api/standings: the current season's, a row per team (the `standings` table's, as the provider gives them).
export interface StandingDto {
  // The year it starts in: 2026 is 2026-27.
  season: number;
  team: { id: string; name: string; abbreviation: string };
  // `Eastern` / `Western`
  conference: string;
  division: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  winPct: number;
  // From the division's leader.
  gamesBehind: number;
  pointsFor: number;
  pointsAgainst: number;
  pointDifferential: number;
  // `W7`
  streak: string;
  // `5-1`
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
