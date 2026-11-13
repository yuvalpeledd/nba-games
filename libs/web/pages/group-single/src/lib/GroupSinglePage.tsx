import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import {
  Box,
  Button,
  List,
  ListItem,
  ListItemText,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material';
import { ApiError, useGroup, useSession } from '@nba/web-core';
import { DeleteGroupDialog, GroupDialog } from '@nba/web-groups-components';
import { PageLoader } from '@nba/web-shell-components';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';

// A group (/groups/:id): what it is, who owns it, and who is in it; its owner edits or deletes it (then it's back to
// /groups, which says so).
// ponytail: its own snackbar, as the groups page's, until an app-wide toast exists.
export function GroupSinglePage() {
  const { id } = useParams() as { id: string };
  const group = useGroup(id);
  const userId = useSession()?.userId;
  const navigate = useNavigate();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  // A bad id (400) or a group the user may not see (404) both read as not found.
  if (group.error instanceof ApiError && group.error.status < 500) {
    return (
      <Stack spacing={3}>
        <Typography variant="h1">Group not found</Typography>
        <Typography color="text.secondary">
          There's no group here, or it's private.
        </Typography>
      </Stack>
    );
  }
  if (!group.data) return <PageLoader error={group.isError} />;
  const { name, owner, status, members, isMember } = group.data;

  return (
    <Stack spacing={3}>
      <Stack
        direction="row"
        useFlexGap
        sx={{
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <div>
          <Typography variant="h1">{name}</Typography>
          <Typography color="text.secondary">
            {group.data.public ? 'Public' : 'Private'} · {status} · Owned by{' '}
            {owner.name}
            {isMember && ' · You are a member'}
          </Typography>
        </div>
        {owner.id === userId && (
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={() => setIsEditOpen(true)}
            >
              Edit
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={() => setIsDeleteOpen(true)}
            >
              Delete
            </Button>
          </Stack>
        )}
      </Stack>
      <Box component="section" aria-label="Members">
        <Typography variant="h6" component="h2">
          Members ({members.length})
        </Typography>
        <List dense aria-label="Members">
          {members.map((member) => (
            <ListItem key={member.id} disableGutters>
              <ListItemText
                primary={member.name}
                secondary={member.id === owner.id ? 'Owner' : undefined}
              />
            </ListItem>
          ))}
        </List>
      </Box>
      {isEditOpen && (
        <GroupDialog
          group={group.data}
          onClose={() => setIsEditOpen(false)}
          toast={setToast}
        />
      )}
      {isDeleteOpen && (
        <DeleteGroupDialog
          group={group.data}
          onClose={() => setIsDeleteOpen(false)}
          onDeleted={(message) =>
            navigate('/groups', { state: { toast: message } })
          }
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
