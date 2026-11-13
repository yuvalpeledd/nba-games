import {
  Link,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import type { StandingDto } from '@nba/dtos-standings';
import { formatGamesBehind, formatWinPct, statHints } from '@nba/web-core';
import { useTableFilters, useTableSort } from '@nba/web-table-components';
import { Link as RouterLink } from 'react-router';

export type ConferenceRow = StandingDto & {
  teamName: string;
  gamesBehind: number;
};

// A conference's standings under its name, with filters and sorting of its own.
export function ConferenceTable({
  conference,
  label,
  rows: conferenceRows,
}: {
  conference: string;
  label: string;
  rows: ConferenceRow[];
}) {
  const filtered = useTableFilters(conferenceRows, {
    seed: { label: 'Seed', type: 'number', value: (row) => row.conferenceRank },
    team: { label: 'Team', type: 'select', value: (row) => row.teamName },
    wins: { label: 'Wins', type: 'number', value: (row) => row.wins },
    losses: { label: 'Losses', type: 'number', value: (row) => row.losses },
    winPct: {
      label: 'Win %',
      type: 'number',
      value: (row) => row.winPct * 100,
    },
    gamesBehind: {
      label: 'Games Behind',
      type: 'number',
      value: (row) => row.gamesBehind,
    },
    conference: {
      label: 'Conference Record',
      type: 'select',
      value: (row) => row.conferenceRecord,
    },
    home: {
      label: 'Home Record',
      type: 'select',
      value: (row) => row.homeRecord,
    },
    away: {
      label: 'Away Record',
      type: 'select',
      value: (row) => row.awayRecord,
    },
    last10: { label: 'Last 10', type: 'select', value: (row) => row.last10 },
    streak: { label: 'Streak', type: 'select', value: (row) => row.streak },
  });
  const { rows, headCell } = useTableSort(filtered.rows, {
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
  });

  return (
    <Stack
      component="section"
      aria-label={label}
      spacing={2}
      sx={{ minWidth: 0, maxWidth: '100%' }}
    >
      <Typography variant="h6" component="h2">
        {label}
      </Typography>
      {filtered.filterBar}
      {/* As wide as its columns, not the page's. */}
      <TableContainer sx={{ width: 'fit-content', maxWidth: '100%' }}>
        <Table size="small" aria-label={`${conference} Conference standings`}>
          <TableHead>
            <TableRow>
              {headCell('seed', '#', undefined, statHints.seed)}
              {headCell('team', 'Team')}
              {headCell('wins', 'W', 'right', statHints.wins)}
              {headCell('losses', 'L', 'right', statHints.losses)}
              {headCell('winPct', 'PCT', 'right', statHints.winPct)}
              {headCell('gamesBehind', 'GB', 'right', statHints.gamesBehind)}
              {headCell('conference', 'Conf', 'right', statHints.conference)}
              {headCell('home', 'Home', 'right', statHints.home)}
              {headCell('away', 'Away', 'right', statHints.away)}
              {headCell('last10', 'L10', 'right', statHints.last10)}
              {headCell('streak', 'Strk', 'right', statHints.streak)}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.teamId}>
                <TableCell>{row.conferenceRank}</TableCell>
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
                    <Link
                      component={RouterLink}
                      to={`/teams/${row.teamId}`}
                      sx={{ whiteSpace: 'nowrap' }}
                    >
                      {row.teamName}
                    </Link>
                  </Stack>
                </TableCell>
                <TableCell align="right">{row.wins}</TableCell>
                <TableCell align="right">{row.losses}</TableCell>
                <TableCell align="right">{formatWinPct(row.winPct)}</TableCell>
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
    </Stack>
  );
}
