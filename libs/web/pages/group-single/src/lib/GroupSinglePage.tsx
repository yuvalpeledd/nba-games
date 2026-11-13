import {
  Box,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import { ApiError, useGroup } from '@nba/web-core';
import { PageLoader } from '@nba/web-shell-components';
import { useParams } from 'react-router';

// A group (/groups/:id): what it is, who owns it, and who is in it.
export function GroupSinglePage() {
  const { id } = useParams() as { id: string };
  const group = useGroup(id);
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
      <div>
        <Typography variant="h1">{name}</Typography>
        <Typography color="text.secondary">
          {group.data.public ? 'Public' : 'Private'} · {status} · Owned by{' '}
          {owner.name}
          {isMember && ' · You are a member'}
        </Typography>
      </div>
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
    </Stack>
  );
}
