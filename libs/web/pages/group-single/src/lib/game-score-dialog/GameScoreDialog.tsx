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
import { setGameScoreRequestSchema } from '@nba/dtos-groups';
import { ErrorCode } from '@nba/enums';
import { ApiError, invalidFields, useSetGroupGameScore } from '@nba/web-core';
import { type FormEvent, useState } from 'react';

const FORM_ID = 'game-score-form';

// The group's owner sets what a right pick of the game scores in it. Says how it went through `toast`, and closes
// once it's saved.
export function GameScoreDialog({
  groupId,
  gameId,
  title,
  score: current,
  onClose,
  toast,
}: {
  groupId: string;
  gameId: string;
  title: string;
  score: number;
  onClose: () => void;
  toast: (message: string) => void;
}) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const setGameScore = useSetGroupGameScore();
  const [score, setScore] = useState(String(current));
  const [invalid, setInvalid] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const request = { score: score === '' ? undefined : score };
    const isInvalid = (await invalidFields(setGameScoreRequestSchema, request))
      .length;
    setInvalid(Boolean(isInvalid));
    if (isInvalid) return;
    const body = setGameScoreRequestSchema.cast(request);
    setGameScore.mutate(
      { groupId, gameId, ...body },
      {
        onSuccess: (saved) => {
          toast(`Game score set to ${saved.score}`);
          onClose();
        },
        onError: (error) =>
          toast(
            error instanceof ApiError && error.code === ErrorCode.GAME_COMPLETED
              ? "This game is completed: its score can't change"
              : "Couldn't set the game score, try again",
          ),
      },
    );
  };

  return (
    <Dialog open onClose={onClose} fullScreen={fullScreen} fullWidth>
      <DialogTitle>Game Score: {title}</DialogTitle>
      <DialogContent>
        {/* noValidate: the schema's message, not the browser's, for an out-of-range number. */}
        <Stack
          component="form"
          id={FORM_ID}
          onSubmit={submit}
          noValidate
          sx={{ pt: 1 }}
        >
          <TextField
            label="Score"
            type="number"
            value={score}
            onChange={(event) => setScore(event.target.value)}
            error={invalid}
            helperText={
              invalid
                ? 'A whole number from 0 to 100 is required'
                : 'What a right pick of this game scores in the group'
            }
            slotProps={{ htmlInput: { min: 0, max: 100, step: 1 } }}
            autoFocus
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          type="submit"
          form={FORM_ID}
          variant="contained"
          loading={setGameScore.isPending}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
