import { GameStatus } from '@nba/sql-games/enums';
import { PredictionPick } from '@nba/sql-predictions/enums';
import { InferType, mixed, number, object } from 'yup';

// A user's pick of a game's winner; null: no prediction.
export interface PredictionDto {
  gameId: string;
  pick: PredictionPick | null;
}

// GET /predictions: the signed-in user's, of a season's games (the year it starts in).
export const predictionsQuerySchema = object({
  season: number()
    .typeError('season must be a year')
    .integer('season must be a year')
    .required(),
});
export type PredictionsQuery = InferType<typeof predictionsQuerySchema>;

// PUT /predictions/:gameId: the pick, or null to take it back.
export const setPredictionRequestSchema = object({
  pick: mixed<PredictionPick>()
    .nullable()
    .defined('pick is required')
    .oneOf(
      [...Object.values(PredictionPick), null],
      `pick must be one of ${Object.values(PredictionPick).join(', ')} or null`,
    ),
});
export type SetPredictionRequest = InferType<typeof setPredictionRequestSchema>;

// A game can be predicted until it begins: before its start time, and while it hasn't started, ended or been called
// off (a postponed game takes picks for its new start).
const OPEN_STATUSES = [
  GameStatus.SCHEDULED,
  GameStatus.POSTPONED,
  GameStatus.DELAYED,
];
export const isPredictionLocked = (
  game: { startTime: string | Date; status: GameStatus },
  now = Date.now(),
): boolean =>
  new Date(game.startTime).getTime() <= now ||
  !OPEN_STATUSES.includes(game.status);

// A game takes picks only from PREDICTION_WINDOW_DAYS before its start, so the schedule's far end stays unpicked.
export const PREDICTION_WINDOW_DAYS = 10;
export const isPredictionTooEarly = (
  game: { startTime: string | Date },
  now = Date.now(),
): boolean =>
  new Date(game.startTime).getTime() - now >
  PREDICTION_WINDOW_DAYS * 24 * 60 * 60 * 1000;

// Whether the pick was right: null until the game is final with a winner, and for no pick (a canceled game voids it).
export const scorePrediction = (
  prediction: { pick: PredictionPick | null } | undefined,
  game: { status: GameStatus; winnerTeamId: string | null; homeTeamId: string },
): boolean | null =>
  !prediction?.pick || game.status !== GameStatus.FINAL || !game.winnerTeamId
    ? null
    : (prediction.pick === PredictionPick.HOME) ===
      (game.winnerTeamId === game.homeTeamId);
