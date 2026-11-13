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
import { useTeams } from '@nba/web-core';
import { PageLoader } from '@nba/web-shell-components';
import { useTableFilters, useTableSort } from '@nba/web-table-components';
import { Link as RouterLink } from 'react-router';

// Today's teams (`/teams` has past franchises too).
export function TeamsPage() {
  const { data: teams, isError } = useTeams();
  const active = teams?.filter((team) => team.active) ?? [];
  const filtered = useTableFilters(active, {
    name: { label: 'Team', type: 'select', value: (team) => team.name },
    conference: {
      label: 'Conference',
      type: 'select',
      value: (team) => team.conference,
    },
  });
  const { rows, headCell } = useTableSort(filtered.rows, {
    name: (team) => team.name,
    conference: (team) => team.conference,
  });
  if (!teams) return <PageLoader error={isError} />;

  return (
    <Stack spacing={3}>
      <Typography variant="h1">Teams</Typography>
      {filtered.filterBar}
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
                <TableCell>
                  <Link component={RouterLink} to={`/teams/${team.id}`}>
                    {team.name}
                  </Link>
                </TableCell>
                <TableCell>{team.conference}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );
}
