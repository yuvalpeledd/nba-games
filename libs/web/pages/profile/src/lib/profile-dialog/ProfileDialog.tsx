import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { updateMeRequestSchema } from '@nba/dtos-auth';
import { invalidFields, useUpdateMe } from '@nba/web-core';
import { FormEvent, useId, useState } from 'react';
import type { ProfileDialogProps } from '../types';
import '../dialog-form.scss';

// Edits the user's name through the API.
export function ProfileDialog({ user, onToast, onClose }: ProfileDialogProps) {
  const formId = useId();
  const isPhone = useMediaQuery(useTheme().breakpoints.down('sm'));
  const updateMe = useUpdateMe();
  const [name, setName] = useState(user.name);
  const [isInvalid, setInvalid] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const invalid = await invalidFields(updateMeRequestSchema, { name });
    setInvalid(invalid.length > 0);
    if (invalid.length) return;
    updateMe.mutate(
      { name },
      {
        onSuccess: () => {
          onToast('Profile saved');
          onClose();
        },
        onError: () => onToast("Couldn't save your profile, try again"),
      },
    );
  };

  return (
    <Dialog open onClose={onClose} fullScreen={isPhone} fullWidth maxWidth="xs">
      <DialogTitle>Edit profile</DialogTitle>
      <DialogContent>
        <Stack
          component="form"
          id={formId}
          spacing={2}
          onSubmit={submit}
          noValidate
          className="dialog-form"
        >
          <TextField
            label="Name"
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            error={isInvalid}
            helperText={isInvalid && 'Required'}
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          type="submit"
          form={formId}
          variant="contained"
          disabled={updateMe.isPending}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
