import {
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { formatHeight, statHints, useTeamPlayers } from '@nba/web-core';
import { PageLoader } from '@nba/web-shell-components';
import { useTableSort } from '@nba/web-table-components';

// The team's current roster, by name.
export function TeamPlayers({ teamId }: { teamId: string }) {
  const { data: players, isError } = useTeamPlayers(teamId);
  const { rows, headCell } = useTableSort(players ?? [], {
    number: (player) => player.jerseyNumber,
    name: (player) => player.name,
    position: (player) => player.position,
    height: (player) => player.heightIn,
    weight: (player) => player.weightLb,
    experience: (player) => player.experienceYears,
    college: (player) => player.college,
  });
  if (!players) return <PageLoader error={isError} />;
  if (players.length === 0) {
    return <Typography color="text.secondary">No players yet.</Typography>;
  }

  return (
    <Stack spacing={2}>
      <TableContainer>
        <Table aria-label="Players">
          <TableHead>
            <TableRow>
              {headCell('number', '#', 'right', statHints.jerseyNumber)}
              {headCell('name', 'Player')}
              {headCell('position', 'Pos', undefined, statHints.position)}
              {headCell('height', 'Ht', 'right', statHints.height)}
              {headCell('weight', 'Wt', 'right', statHints.weight)}
              {headCell('experience', 'Exp', 'right', statHints.experience)}
              {headCell('college', 'College')}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((player) => (
              <TableRow key={player.id}>
                <TableCell align="right">
                  {player.jerseyNumber ?? '—'}
                </TableCell>
                <TableCell>{player.name}</TableCell>
                <TableCell>{player.position ?? '—'}</TableCell>
                <TableCell align="right">
                  {player.heightIn === null
                    ? '—'
                    : formatHeight(player.heightIn)}
                </TableCell>
                <TableCell align="right">{player.weightLb ?? '—'}</TableCell>
                <TableCell align="right">
                  {/* The league's way: R for a rookie. */}
                  {player.experienceYears === 0
                    ? 'R'
                    : (player.experienceYears ?? '—')}
                </TableCell>
                <TableCell>{player.college ?? '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );
}
