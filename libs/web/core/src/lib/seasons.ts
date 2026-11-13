import type { SeasonDto } from '@nba/dtos-seasons';

// The season the app shows by default: the newest that has started (by the viewer's day), else the newest, as
// between seasons the next one's migration can be in before it starts. `seasons` newest first, as /seasons has them.
export const currentSeason = (
  seasons: SeasonDto[],
  today = new Date().toLocaleDateString('en-CA'), // YYYY-MM-DD
): SeasonDto | undefined =>
  seasons.find(({ startDate }) => startDate <= today) ?? seasons[0];
