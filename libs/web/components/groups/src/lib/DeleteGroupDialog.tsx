import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';
import type { GroupDto } from '@nba/dtos-groups';
import { useDeleteGroup } from '@nba/web-core';

// Asks its owner before deleting a group (no one sees it again). Says how it went through `toast`, or, once it's gone,
// hands the message to `onDeleted` when there is one (a page that leaves, to say it where it lands).
export function DeleteGroupDialog({
  group,
  onClose,
  onDeleted,
  toast,
}: {
  group: GroupDto;
  onClose: () => void;
  onDeleted?: (message: string) => void;
  toast: (message: string) => void;
}) {
  const deleteGroup = useDeleteGroup();
  const remove = () =>
    deleteGroup.mutate(group.id, {
      onSuccess: () => {
        const message = `Group ${group.name} deleted`;
        if (onDeleted) onDeleted(message);
        else toast(message);
        onClose();
      },
      onError: () => toast("Couldn't delete the group, try again"),
    });

  return (
    <Dialog open onClose={onClose}>
      <DialogTitle>Delete {group.name}?</DialogTitle>
      <DialogContent>
        <DialogContentText>
          No one will see the group or its members again.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          color="error"
          variant="contained"
          onClick={remove}
          loading={deleteGroup.isPending}
        >
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );
}
