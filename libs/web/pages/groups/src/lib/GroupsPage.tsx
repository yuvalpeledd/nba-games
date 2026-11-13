import AddIcon from '@mui/icons-material/Add';
import { Button, Snackbar, Stack, Typography } from '@mui/material';
import { useGroups } from '@nba/web-core';
import { PageLoader } from '@nba/web-shell-components';
import { useState } from 'react';
import { GroupsTable } from './groups-table/GroupsTable';
import { NewGroupDialog } from './new-group-dialog/NewGroupDialog';

// The signed-in user's groups and, beside them, the public ones they're not in; New Group makes one.
// ponytail: its own snackbar, as PredictionCell's and the profile page's, until an app-wide toast exists.
export function GroupsPage() {
  const groups = useGroups();
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

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
      ) : (
        <Stack direction="row" useFlexGap sx={{ flexWrap: 'wrap', gap: 4 }}>
          <GroupsTable
            label="My groups"
            groups={groups.data.filter((group) => group.isMember)}
            empty="You're in no groups yet."
          />
          <GroupsTable
            label="Public groups"
            groups={groups.data.filter(
              (group) => group.public && !group.isMember,
            )}
            empty="No public groups you're not in."
          />
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
