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
  formatGamesBehind,
  formatSeason,
  formatWinPct,
  useStandings,
} from '@nba/web-core';
import { PageLoader } from '@nba/web-shell-components';
import { useTableSort } from '@nba/web-table-components';
import { useState } from 'react';

// The tabs: the provider's conference names, and their labels.
const conferences = [
  ['Eastern', 'East'],
  ['Western', 'West'],
] as const;

// A conference's standings, by seed, each with its games behind the conference's leader (the provider's
// `gamesBehind` is from the division's).
const standingsOf = (standings: StandingDto[], conference: string) => {
  const rows = standings
    .filter((row) => row.conference === conference)
    .sort((a, b) => a.conferenceRank - b.conferenceRank);
  const [leader] = rows;
  return rows.map((row) => ({
    ...row,
    gamesBehind: (leader.wins - row.wins + (row.losses - leader.losses)) / 2,
  }));
};

export function StandingsPage() {
  const { data: standings, isError } = useStandings();
  const [conference, setConference] = useState<string>(conferences[0][0]);
  const { rows, headCell } = useTableSort(
    standingsOf(standings ?? [], conference),
    {
      seed: (row) => row.conferenceRank,
      team: (row) => row.team.name,
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
  if (!standings) return <PageLoader error={isError} />;

  return (
    <Stack spacing={3}>
      <div>
        <Typography variant="h1">Standings</Typography>
        {standings.length > 0 && (
          <Typography color="text.secondary">
            {formatSeason(standings[0].season)}
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
                <TableRow key={row.team.id}>
                  <TableCell align="right">{row.conferenceRank}</TableCell>
                  <TableCell>{row.team.name}</TableCell>
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
