import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { createGroupRequestSchema, type GroupDto } from '@nba/dtos-groups';
import { invalidFields, useCreateGroup, useUpdateGroup } from '@nba/web-core';
import { type FormEvent, useState } from 'react';

const FORM_ID = 'group-form';

// A group's name, and whether everyone sees it: a new one the signed-in user will own, or `group`, which they own,
// edited. Says how it went through `toast`, and closes once it's saved.
export function GroupDialog({
  group,
  onClose,
  toast,
}: {
  group?: GroupDto;
  onClose: () => void;
  toast: (message: string) => void;
}) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const createGroup = useCreateGroup();
  const updateGroup = useUpdateGroup();
  const [name, setName] = useState(group?.name ?? '');
  const [isPublic, setIsPublic] = useState(group?.public ?? false);
  const [nameInvalid, setNameInvalid] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const request = { name, public: isPublic };
    const invalid = await invalidFields(createGroupRequestSchema, request);
    setNameInvalid(invalid.includes('name'));
    if (invalid.length) return;
    const body = createGroupRequestSchema.cast(request);
    const done = {
      onSuccess: (saved: GroupDto) => {
        toast(`Group ${saved.name} ${group ? 'saved' : 'created'}`);
        onClose();
      },
      onError: () =>
        toast(`Couldn't ${group ? 'save' : 'create'} the group, try again`),
    };
    if (group) updateGroup.mutate({ id: group.id, ...body }, done);
    else createGroup.mutate(body, done);
  };

  return (
    <Dialog open onClose={onClose} fullScreen={fullScreen} fullWidth>
      <DialogTitle>{group ? 'Edit Group' : 'New Group'}</DialogTitle>
      <DialogContent>
        <Stack component="form" id={FORM_ID} onSubmit={submit} sx={{ pt: 1 }}>
          <TextField
            label="Name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            error={nameInvalid}
            helperText={
              nameInvalid ? 'A name of up to 100 characters is required' : ' '
            }
            autoFocus
          />
          <FormControlLabel
            control={
              <Switch
                checked={isPublic}
                onChange={(event) => setIsPublic(event.target.checked)}
              />
            }
            label="Public"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          type="submit"
          form={FORM_ID}
          variant="contained"
          loading={createGroup.isPending || updateGroup.isPending}
        >
          {group ? 'Save' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
