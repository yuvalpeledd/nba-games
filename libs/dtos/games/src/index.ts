import { daySchema, idSchema, VenueDto } from '@nba/dtos';
import { GameStatus, SeasonType } from '@nba/sql-games/enums';
import { InferType, number, object } from 'yup';

export interface GameDto {
  id: string;
  // The year it starts in: 2026 is 2026-27.
  season: number;
  seasonType: SeasonType;
  // 'YYYY-MM-DD', the day the league lists it on (US Eastern).
  date: string;
  // ISO, UTC.
  startTime: string;
  status: GameStatus;
  statusDetail: string | null;
  period: number | null;
  clock: string | null;
  homeTeamId: string;
  awayTeamId: string;
  // Null until it starts.
  homeScore: number | null;
  awayScore: number | null;
  periodScores: { home: number[]; away: number[] } | null;
  decidedIn: string | null;
  // Null until it's final.
  winnerTeamId: string | null;
  venue: VenueDto | null;
  neutralSite: boolean;
  originalDate: string | null;
}

// The longest range GET /games answers, in days (a month's schedule).
export const MAX_GAME_DAYS = 31;

// The range's checks, on two real days only: a bad one already has its message.
const rangeTest =
  (holds: (from: string, to: string) => boolean) =>
  (to: string | undefined, { parent }: { parent: { from?: string } }) =>
    !to ||
    !parent.from ||
    !daySchema.isValidSync(to) ||
    !daySchema.isValidSync(parent.from) ||
    holds(parent.from, to);

const daysFrom = (from: string, to: string): number =>
  (Date.parse(to) - Date.parse(from)) / 86_400_000 + 1;

// GET /games: the days from `from` to `to` (both included; `to` defaults to `from`), only a team's when `teamId` is given;
// or, with `season` (the year it starts in) instead of the days, the whole season, every type of game, only a team's
// when `teamId` is given; or, with `opponentId` instead, every game between `teamId` and it, every season.
// ponytail: a season isn't paged (~1,300 games, the web filters them in the browser); page it if that gets slow.
export const gamesQuerySchema = object({
  from: daySchema.when(['season', 'opponentId'], {
    is: (season?: number, opponentId?: string) =>
      season === undefined && opponentId === undefined,
    then: (schema) => schema.required(),
  }),
  to: daySchema
    .test(
      'not-before-from',
      'to must not be before from',
      rangeTest((from, to) => to >= from),
    )
    .test(
      'max-days',
      `from and to must be at most ${MAX_GAME_DAYS} days apart`,
      rangeTest((from, to) => daysFrom(from, to) <= MAX_GAME_DAYS),
    ),
  season: number()
    .typeError('season must be a year')
    .integer('season must be a year')
    .test(
      'alone',
      'season cannot be combined with from or to',
      (season, { parent }) =>
        season === undefined ||
        (parent.from === undefined && parent.to === undefined),
    ),
  // ponytail: not paged, ~4 games a season against one team; page it if the history grows past a few seasons.
  opponentId: idSchema.test(
    'alone',
    'opponentId cannot be combined with from, to or season',
    (opponentId, { parent }) =>
      opponentId === undefined ||
      (parent.from === undefined &&
        parent.to === undefined &&
        parent.season === undefined),
  ),
  teamId: idSchema.when('opponentId', {
    is: (opponentId?: string) => opponentId !== undefined,
    then: (schema) => schema.required('teamId is required with opponentId'),
  }),
});
export type GamesQuery = InferType<typeof gamesQuerySchema>;
