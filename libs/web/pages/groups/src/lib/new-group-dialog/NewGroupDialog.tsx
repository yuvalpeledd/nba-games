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
import { createGroupRequestSchema } from '@nba/dtos-groups';
import { invalidFields, useCreateGroup } from '@nba/web-core';
import { type FormEvent, useState } from 'react';

const FORM_ID = 'new-group-form';

// A group the signed-in user will own: its name, and whether everyone sees it. Says how it went through `toast`, and
// closes once it's made.
export function NewGroupDialog({
  onClose,
  toast,
}: {
  onClose: () => void;
  toast: (message: string) => void;
}) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const createGroup = useCreateGroup();
  const [name, setName] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [nameInvalid, setNameInvalid] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const request = { name, public: isPublic };
    const invalid = await invalidFields(createGroupRequestSchema, request);
    setNameInvalid(invalid.includes('name'));
    if (invalid.length) return;
    createGroup.mutate(createGroupRequestSchema.cast(request), {
      onSuccess: (group) => {
        toast(`Group ${group.name} created`);
        onClose();
      },
      onError: () => toast("Couldn't create the group, try again"),
    });
  };

  return (
    <Dialog open onClose={onClose} fullScreen={fullScreen} fullWidth>
      <DialogTitle>New Group</DialogTitle>
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
          loading={createGroup.isPending}
        >
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );
}
