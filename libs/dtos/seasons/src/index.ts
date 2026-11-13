export interface SeasonDto {
  // `nba-2026-27`
  id: string;
  // `NBA 2026-2027`
  name: string;
  // The year it starts in (2026), as games and standings carry it: GET /standings?season=<year>.
  year: number;
  // 'YYYY-MM-DD', the regular season's first and last days.
  startDate: string;
  endDate: string;
}
