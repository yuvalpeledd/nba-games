import MoreVertIcon from '@mui/icons-material/MoreVert';
import {
  IconButton,
  Link,
  Menu,
  MenuItem,
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
import { useSession } from '@nba/web-core';
import { useTableSort } from '@nba/web-table-components';
import { useState } from 'react';
import { Link as RouterLink } from 'react-router';

const yesNo = (value: boolean) => (value ? 'Yes' : 'No');

// A group's owner's menu: Edit and Delete.
function GroupActions({
  group,
  onEdit,
  onDelete,
}: {
  group: GroupDto;
  onEdit: (group: GroupDto) => void;
  onDelete: (group: GroupDto) => void;
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const pick = (action: (group: GroupDto) => void) => () => {
    setAnchor(null);
    action(group);
  };
  return (
    <>
      <IconButton
        size="small"
        aria-label={`Actions for ${group.name}`}
        onClick={(event) => setAnchor(event.currentTarget)}
      >
        <MoreVertIcon fontSize="small" />
      </IconButton>
      <Menu
        anchorEl={anchor}
        open={anchor !== null}
        onClose={() => setAnchor(null)}
      >
        <MenuItem onClick={pick(onEdit)}>Edit</MenuItem>
        <MenuItem onClick={pick(onDelete)}>Delete</MenuItem>
      </Menu>
    </>
  );
}

// Groups under a heading, with sorting of their own; each name opens its group. With `onEdit` and
// `onDelete`, the groups the signed-in user owns have a menu of them.
export function GroupsTable({
  label,
  groups,
  empty,
  onEdit,
  onDelete,
}: {
  label: string;
  groups: GroupDto[];
  empty: string;
  onEdit?: (group: GroupDto) => void;
  onDelete?: (group: GroupDto) => void;
}) {
  const userId = useSession()?.userId;
  const { rows, headCell } = useTableSort(groups, {
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
                  {onEdit && onDelete && <TableCell>Actions</TableCell>}
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
                    {onEdit && onDelete && (
                      <TableCell>
                        {group.owner.id === userId && (
                          <GroupActions
                            group={group}
                            onEdit={onEdit}
                            onDelete={onDelete}
                          />
                        )}
                      </TableCell>
                    )}
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
