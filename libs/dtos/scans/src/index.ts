// A data-fetcher run (the `scans` table): when, whether every fetcher succeeded, and what it wrote.
export interface ScanDto {
  // ISO moments.
  startedAt: string;
  finishedAt: string;
  success: boolean;
  // Rows of the NBA tables (teams, players, standings, games) added, updated and left unchanged.
  inserted: number;
  updated: number;
  unchanged: number;
  // The failed fetchers' errors, a line each; null when none.
  error: string | null;
}
