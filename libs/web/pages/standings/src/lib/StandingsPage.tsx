import { Stack, Typography } from '@mui/material';
import type { StandingDto } from '@nba/dtos-standings';
import {
  currentSeason,
  formatSeason,
  useSeasons,
  useStandings,
  useTeams,
} from '@nba/web-core';
import { PageLoader } from '@nba/web-shell-components';
import {
  type ConferenceRow,
  ConferenceTable,
} from './conference-table/ConferenceTable';

// The provider's conference names, and their labels.
const conferences = [
  ['Eastern', 'East'],
  ['Western', 'West'],
] as const;

// A conference's standings, by seed, each with its team's nickname (short, so both conferences fit side by side) and its games behind the conference's leader (the
// provider's `gamesBehind` is from the division's).
const standingsOf = (
  standings: StandingDto[],
  conference: string,
  teamNames: Map<string, string>,
): ConferenceRow[] => {
  const rows = standings
    .filter((row) => row.conference === conference)
    .sort((a, b) => a.conferenceRank - b.conferenceRank);
  const [leader] = rows;
  return rows.map((row) => ({
    ...row,
    teamName: teamNames.get(row.teamId) ?? row.teamId,
    gamesBehind: (leader.wins - row.wins + (row.losses - leader.losses)) / 2,
  }));
};

// The current season's standings: both conferences side by side, one above the other where they don't fit.
export function StandingsPage() {
  const seasons = useSeasons();
  const season = seasons.data && currentSeason(seasons.data);
  const standings = useStandings(season?.year);
  const teams = useTeams();
  // No season at all: nothing to wait for.
  if (!seasons.data || (season && !standings.data) || !teams.data) {
    const isError = seasons.isError || standings.isError || teams.isError;
    return <PageLoader error={isError} />;
  }
  const teamNames = new Map(
    teams.data.map(({ id, nickname }) => [id, nickname]),
  );

  return (
    <Stack spacing={3}>
      <div>
        <Typography variant="h1">Standings</Typography>
        {season && (
          <Typography color="text.secondary">
            {formatSeason(season.year)}
          </Typography>
        )}
      </div>
      {!standings.data?.length ? (
        <Typography color="text.secondary">No standings yet.</Typography>
      ) : (
        <Stack direction="row" useFlexGap sx={{ flexWrap: 'wrap', gap: 4 }}>
          {conferences.map(([conference, label]) => {
            const rows = standingsOf(standings.data, conference, teamNames);
            return (
              rows.length > 0 && (
                <ConferenceTable
                  key={conference}
                  conference={conference}
                  label={label}
                  rows={rows}
                />
              )
            );
          })}
        </Stack>
      )}
    </Stack>
  );
}
