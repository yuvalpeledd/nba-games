import AddIcon from '@mui/icons-material/Add';
import {
  Button,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useGroups } from '@nba/web-core';
import { PageLoader } from '@nba/web-shell-components';
import { useTableFilters, useTableSort } from '@nba/web-table-components';
import { useState } from 'react';
import { NewGroupDialog } from './new-group-dialog/NewGroupDialog';

const yesNo = (value: boolean) => (value ? 'Yes' : 'No');

// The groups the signed-in user may see (every public one and theirs), and New Group to make one.
// ponytail: its own snackbar, as PredictionCell's; share one app-wide when a third mutation needs it.
export function GroupsPage() {
  const groups = useGroups();
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const filtered = useTableFilters(groups.data ?? [], {
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
    <Stack spacing={3}>
      <Stack
        direction="row"
        sx={{ justifyContent: 'space-between', alignItems: 'center' }}
      >
        <Typography variant="h1">Groups</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setIsNewOpen(true)}
        >
          New Group
        </Button>
      </Stack>
      {!groups.data ? (
        <PageLoader error={groups.isError} />
      ) : groups.data.length === 0 ? (
        <Typography color="text.secondary">No groups yet.</Typography>
      ) : (
        <Stack spacing={2}>
          {filtered.filterBar}
          <TableContainer>
            <Table aria-label="Groups">
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
                    <TableCell>{group.name}</TableCell>
                    <TableCell align="right">{group.memberCount}</TableCell>
                    <TableCell>{group.owner.name}</TableCell>
                    <TableCell>{yesNo(group.public)}</TableCell>
                    <TableCell>{group.status}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Stack>
      )}
      {isNewOpen && (
        <NewGroupDialog onClose={() => setIsNewOpen(false)} toast={setToast} />
      )}
      <Snackbar
        open={toast !== null}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        message={toast}
      />
    </Stack>
  );
}
