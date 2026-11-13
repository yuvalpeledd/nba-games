// GET /api/teams: the active teams, by name.
export interface TeamDto {
  // `nba-por`
  id: string;
  // `POR`
  abbreviation: string;
  // `Portland Trail Blazers`
  name: string;
  // `Trail Blazers`
  nickname: string;
  city: string;
  // `Eastern` / `Western`
  conference: string;
  // `Northwest`
  division: string;
}
