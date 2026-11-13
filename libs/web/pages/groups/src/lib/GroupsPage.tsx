import AddIcon from '@mui/icons-material/Add';
import { Button, Snackbar, Stack, Typography } from '@mui/material';
import type { GroupDto } from '@nba/dtos-groups';
import { useGroups } from '@nba/web-core';
import { DeleteGroupDialog, GroupDialog } from '@nba/web-groups-components';
import { PageLoader } from '@nba/web-shell-components';
import { useState } from 'react';
import { useLocation } from 'react-router';
import { GroupsTable } from './groups-table/GroupsTable';

// The signed-in user's groups and, beside them, the public ones they're not in; New Group makes one, and the owner's
// menu in My groups edits or deletes one. Opens on the toast a link's state brings (a group page's Delete).
// ponytail: its own snackbar, as PredictionCell's and the profile page's, until an app-wide toast exists.
export function GroupsPage() {
  const groups = useGroups();
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [editing, setEditing] = useState<GroupDto | null>(null);
  const [deleting, setDeleting] = useState<GroupDto | null>(null);
  const linked = useLocation().state as { toast?: string } | null;
  const [toast, setToast] = useState<string | null>(linked?.toast ?? null);

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
            onEdit={setEditing}
            onDelete={setDeleting}
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
        <GroupDialog onClose={() => setIsNewOpen(false)} toast={setToast} />
      )}
      {editing && (
        <GroupDialog
          group={editing}
          onClose={() => setEditing(null)}
          toast={setToast}
        />
      )}
      {deleting && (
        <DeleteGroupDialog
          group={deleting}
          onClose={() => setDeleting(null)}
          toast={setToast}
        />
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
