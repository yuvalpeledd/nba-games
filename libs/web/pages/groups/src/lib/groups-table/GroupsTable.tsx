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
import type { GroupDto } from '@nba/dtos-groups';
import { useTableFilters, useTableSort } from '@nba/web-table-components';
import { Link as RouterLink } from 'react-router';

const yesNo = (value: boolean) => (value ? 'Yes' : 'No');

// Groups under a heading, with filters and sorting of their own; each name opens its group.
export function GroupsTable({
  label,
  groups,
  empty,
}: {
  label: string;
  groups: GroupDto[];
  empty: string;
}) {
  const filtered = useTableFilters(groups, {
    name: { label: 'Name', type: 'select', value: (group) => group.name },
    members: {
      label: 'Members',
      type: 'number',
      value: (group) => group.memberCount,
    },
    owner: {
      label: 'Owner',
      type: 'select',
      value: (group) => group.owner.name,
    },
    public: {
      label: 'Public',
      type: 'select',
      value: (group) => yesNo(group.public),
    },
    status: { label: 'Status', type: 'select', value: (group) => group.status },
  });
  const { rows, headCell } = useTableSort(filtered.rows, {
    name: (group) => group.name,
    members: (group) => group.memberCount,
    owner: (group) => group.owner.name,
    public: (group) => yesNo(group.public),
    status: (group) => group.status,
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
      {groups.length === 0 ? (
        <Typography color="text.secondary">{empty}</Typography>
      ) : (
        <>
          {filtered.filterBar}
          {/* As wide as its columns, not the page's. */}
          <TableContainer sx={{ width: 'fit-content', maxWidth: '100%' }}>
            <Table size="small" aria-label={label}>
              <TableHead>
                <TableRow>
                  {headCell('name', 'Name')}
                  {headCell('members', 'Members', 'right')}
                  {headCell('owner', 'Owner')}
                  {headCell('public', 'Public')}
                  {headCell('status', 'Status')}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((group) => (
                  <TableRow key={group.id}>
                    <TableCell>
                      <Link component={RouterLink} to={`/groups/${group.id}`}>
                        {group.name}
                      </Link>
                    </TableCell>
                    <TableCell align="right">{group.memberCount}</TableCell>
                    <TableCell>{group.owner.name}</TableCell>
                    <TableCell>{yesNo(group.public)}</TableCell>
                    <TableCell>{group.status}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </Stack>
  );
}
