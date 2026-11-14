import { Stack, Typography } from '@mui/material';
import {
  currentSeason,
  formatSeason,
  usePredictions,
  useSeasonGames,
  useSeasons,
  useTeams,
} from '@nba/web-core';
import {
  GamesTable,
  type GamesTableFilter,
} from '@nba/web-predictions-components';
import { PageLoader } from '@nba/web-shell-components';
import { useLocation } from 'react-router';

// Every team's games in the current season, by day, filtered and paged in the browser; at first, unfiltered, or by the
// `filters` of the navigation's state (the dashboard's link to this week's games left to pick).
export function GamesPage() {
  const linkedFilters = (
    useLocation().state as { filters?: GamesTableFilter[] } | null
  )?.filters;
  const seasons = useSeasons();
  const season = seasons.data && currentSeason(seasons.data);
  const teams = useTeams();
  const games = useSeasonGames(season?.year);
  const predictions = usePredictions(season?.year);
  // No season at all: nothing to wait for.
  if (!seasons.data || (season && !games.data) || !teams.data) {
    const isError = seasons.isError || games.isError || teams.isError;
    return <PageLoader error={isError} />;
  }

  return (
    <Stack spacing={3}>
      <div>
        <Typography variant="h1">Games</Typography>
        {season && (
          <Typography color="text.secondary">
            {formatSeason(season.year)}
          </Typography>
        )}
      </div>
      <GamesTable
        games={games.data ?? []}
        teams={teams.data}
        picks={
          new Map(predictions.data?.map(({ gameId, pick }) => [gameId, pick]))
        }
        filters={linkedFilters}
      />
    </Stack>
  );
}
