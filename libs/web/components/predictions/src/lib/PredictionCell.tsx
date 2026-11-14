import {
  Snackbar,
  TableCell,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import type { GameDto } from '@nba/dtos-games';
import { isPredictionLocked, scorePrediction } from '@nba/dtos-predictions';
import { ErrorCode } from '@nba/enums';
import { PredictionPick } from '@nba/sql-predictions/enums';
import { ApiError, useSetPrediction } from '@nba/web-core';
import { useState } from 'react';

// A pick as a games table shows and filters it.
export const predictionLabel = (pick: PredictionPick | null | undefined) =>
  pick ?? 'None';

// The signed-in user's pick of the game's winner: Away or Home to choose until it begins (choosing the pick again
// takes it back), then the pick as text: green once the game is final if it was right, red if wrong.
// ponytail: its own snackbar, as there's no app-wide toast yet; share one when a second mutation needs it.
export function PredictionCell({
  game,
  pick,
}: {
  game: GameDto;
  pick: PredictionPick | null | undefined;
}) {
  const setPrediction = useSetPrediction();
  const right = scorePrediction({ pick: pick ?? null }, game);
  const [toast, setToast] = useState<string | null>(null);
  const choose = (next: PredictionPick | null) =>
    setPrediction.mutate(
      { game, pick: next },
      {
        onSuccess: () =>
          setToast(next ? `Predicted: ${next} wins` : 'Prediction removed'),
        onError: (error) =>
          setToast(
            error instanceof ApiError &&
              error.code === ErrorCode.PREDICTION_LOCKED
              ? 'This game has begun: its predictions are locked'
              : "Couldn't save your prediction, try again",
          ),
      },
    );

  return (
    <TableCell sx={{ py: 0 }}>
      {isPredictionLocked(game) ? (
        // On its own element: the design system colors every cell.
        <Typography
          component="span"
          variant="inherit"
          color={right === null ? undefined : right ? 'success' : 'error'}
        >
          {predictionLabel(pick)}
        </Typography>
      ) : (
        <ToggleButtonGroup
          exclusive
          aria-label="Prediction"
          value={pick ?? null}
          disabled={setPrediction.isPending}
          onChange={(_, next: PredictionPick | null) => choose(next)}
        >
          <ToggleButton value={PredictionPick.AWAY}>Away</ToggleButton>
          <ToggleButton value={PredictionPick.HOME}>Home</ToggleButton>
        </ToggleButtonGroup>
      )}
      <Snackbar
        open={toast !== null}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        message={toast}
      />
    </TableCell>
  );
}
