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
import {
  createGroupRequestSchema,
  DEFAULT_GAME_SCORE,
  type GroupDto,
  MAX_GROUP_MEMBERS,
} from '@nba/dtos-groups';
import { invalidFields, useCreateGroup, useUpdateGroup } from '@nba/web-core';
import { type FormEvent, useState } from 'react';

const FORM_ID = 'group-form';

type Field = 'name' | 'defaultScore' | 'maxMembers' | 'startDate' | 'endDate';

// A group's name, whether everyone sees it, what a right pick scores, how many may join, and which games' days score:
// a new one the signed-in user will own, or `group`, which they own, edited. Says how it went through `toast`, and
// closes once it's saved.
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
  const [defaultScore, setDefaultScore] = useState(
    String(group?.defaultScore ?? DEFAULT_GAME_SCORE),
  );
  const [maxMembers, setMaxMembers] = useState(
    String(group?.maxMembers ?? MAX_GROUP_MEMBERS),
  );
  const [startDate, setStartDate] = useState(group?.startDate ?? '');
  const [endDate, setEndDate] = useState(group?.endDate ?? '');
  const [invalid, setInvalid] = useState<Field[]>([]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const request = {
      name,
      public: isPublic,
      defaultScore,
      maxMembers,
      startDate: startDate || null,
      endDate: endDate || null,
    };
    const fields = await invalidFields<Field>(
      createGroupRequestSchema,
      request,
    );
    if (Number(maxMembers) < minMembers) fields.push('maxMembers');
    setInvalid(fields);
    if (fields.length) return;
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

  const helper = (field: Field, message: string) =>
    invalid.includes(field) ? message : ' ';
  // A group's members can't be fewer than it has.
  const minMembers = group?.memberCount ?? 1;

  return (
    <Dialog open onClose={onClose} fullScreen={fullScreen} fullWidth>
      <DialogTitle>{group ? 'Edit Group' : 'New Group'}</DialogTitle>
      <DialogContent>
        <Stack component="form" id={FORM_ID} onSubmit={submit} sx={{ pt: 1 }}>
          <TextField
            label="Name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            error={invalid.includes('name')}
            helperText={helper(
              'name',
              'A name of up to 100 characters is required',
            )}
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
            sx={{ mb: 2 }}
          />
          <Stack direction="row" spacing={2}>
            <TextField
              label="Default score"
              type="number"
              value={defaultScore}
              onChange={(event) => setDefaultScore(event.target.value)}
              error={invalid.includes('defaultScore')}
              helperText={helper('defaultScore', 'A whole number from 1 to 10')}
              fullWidth
            />
            <TextField
              label="Max members"
              type="number"
              value={maxMembers}
              onChange={(event) => setMaxMembers(event.target.value)}
              error={invalid.includes('maxMembers')}
              helperText={helper(
                'maxMembers',
                `A whole number from ${minMembers} to ${MAX_GROUP_MEMBERS}`,
              )}
              fullWidth
            />
          </Stack>
          <Stack direction="row" spacing={2}>
            <TextField
              label="Start date"
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              error={invalid.includes('startDate')}
              helperText={helper('startDate', 'A date')}
              slotProps={{ inputLabel: { shrink: true } }}
              fullWidth
            />
            <TextField
              label="End date"
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              error={invalid.includes('endDate')}
              helperText={helper('endDate', 'Not before the start date')}
              slotProps={{ inputLabel: { shrink: true } }}
              fullWidth
            />
          </Stack>
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
