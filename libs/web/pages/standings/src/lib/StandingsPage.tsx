import {
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Typography,
} from '@mui/material';
import type { StandingDto } from '@nba/dtos-standings';
import {
  currentSeason,
  formatGamesBehind,
  formatSeason,
  formatWinPct,
  useSeasons,
  useStandings,
  useTeams,
} from '@nba/web-core';
import { PageLoader } from '@nba/web-shell-components';
import { useTableSort } from '@nba/web-table-components';
import { useState } from 'react';

// The tabs: the provider's conference names, and their labels.
const conferences = [
  ['Eastern', 'East'],
  ['Western', 'West'],
] as const;

// A conference's standings, by seed, each with its team's name and its games behind the conference's leader (the
// provider's `gamesBehind` is from the division's).
const standingsOf = (
  standings: StandingDto[],
  conference: string,
  teamNames: Map<string, string>,
) => {
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

// The current season's standings.
export function StandingsPage() {
  const seasons = useSeasons();
  const season = seasons.data && currentSeason(seasons.data);
  const standings = useStandings(season?.year);
  const teams = useTeams();
  const [conference, setConference] = useState<string>(conferences[0][0]);
  const teamNames = new Map(teams.data?.map(({ id, name }) => [id, name]));
  const { rows, headCell } = useTableSort(
    standingsOf(standings.data ?? [], conference, teamNames),
    {
      seed: (row) => row.conferenceRank,
      team: (row) => row.teamName,
      wins: (row) => row.wins,
      losses: (row) => row.losses,
      winPct: (row) => row.winPct,
      gamesBehind: (row) => row.gamesBehind,
      conference: (row) => row.conferenceRecord,
      home: (row) => row.homeRecord,
      away: (row) => row.awayRecord,
      last10: (row) => row.last10,
      streak: (row) => row.streak,
    },
  );
  // No season at all: nothing to wait for.
  if (!seasons.data || (season && !standings.data) || !teams.data) {
    const isError = seasons.isError || standings.isError || teams.isError;
    return <PageLoader error={isError} />;
  }

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
      <Tabs value={conference} onChange={(_, next) => setConference(next)}>
        {conferences.map(([value, label]) => (
          <Tab key={value} value={value} label={label} />
        ))}
      </Tabs>
      {rows.length === 0 ? (
        <Typography color="text.secondary">No standings yet.</Typography>
      ) : (
        <TableContainer>
          <Table aria-label={`${conference} Conference standings`}>
            <TableHead>
              <TableRow>
                {headCell('seed', '#', 'right')}
                {headCell('team', 'Team')}
                {headCell('wins', 'W', 'right')}
                {headCell('losses', 'L', 'right')}
                {headCell('winPct', 'PCT', 'right')}
                {headCell('gamesBehind', 'GB', 'right')}
                {headCell('conference', 'Conf', 'right')}
                {headCell('home', 'Home', 'right')}
                {headCell('away', 'Away', 'right')}
                {headCell('last10', 'L10', 'right')}
                {headCell('streak', 'Strk', 'right')}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.teamId}>
                  <TableCell align="right">{row.conferenceRank}</TableCell>
                  <TableCell>
                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{ alignItems: 'center' }}
                    >
                      {/* Decorative: the name beside it says which team. */}
                      <img
                        src={`/logos/${row.teamId}.svg`}
                        alt=""
                        width={24}
                        height={24}
                      />
                      <span>{row.teamName}</span>
                    </Stack>
                  </TableCell>
                  <TableCell align="right">{row.wins}</TableCell>
                  <TableCell align="right">{row.losses}</TableCell>
                  <TableCell align="right">
                    {formatWinPct(row.winPct)}
                  </TableCell>
                  <TableCell align="right">
                    {formatGamesBehind(row.gamesBehind)}
                  </TableCell>
                  <TableCell align="right">{row.conferenceRecord}</TableCell>
                  <TableCell align="right">{row.homeRecord}</TableCell>
                  <TableCell align="right">{row.awayRecord}</TableCell>
                  <TableCell align="right">{row.last10}</TableCell>
                  <TableCell align="right">{row.streak}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Stack>
  );
}
