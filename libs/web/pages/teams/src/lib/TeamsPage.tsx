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
import { useTeams } from '@nba/web-core';
import { PageLoader } from '@nba/web-shell-components';
import { useTableSort } from '@nba/web-table-components';

export function TeamsPage() {
  const { data: teams, isError } = useTeams();
  const { rows, headCell } = useTableSort(teams ?? [], {
    name: (team) => team.name,
    conference: (team) => team.conference,
  });
  if (!teams) return <PageLoader error={isError} />;

  return (
    <Stack spacing={3}>
      <Typography variant="h1">Teams</Typography>
      <TableContainer>
        <Table aria-label="Teams">
          <TableHead>
            <TableRow>
              {headCell('name', 'Team')}
              {headCell('conference', 'Conference')}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((team) => (
              <TableRow key={team.id}>
                <TableCell>{team.name}</TableCell>
                <TableCell>{team.conference}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );
}
