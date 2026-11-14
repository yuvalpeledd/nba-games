import { daySchema } from '@nba/dtos';
import { GameStatus } from '@nba/sql-games/enums';
import type { GroupStatus } from '@nba/sql-groups/enums';
import type { PredictionPick } from '@nba/sql-predictions/enums';
import { boolean, InferType, number, object, string } from 'yup';

export interface GroupDto {
  id: string;
  name: string;
  public: boolean;
  status: GroupStatus;
  owner: { id: string; name: string };
  memberCount: number;
  // Whether the signed-in user is in it.
  isMember: boolean;
  // What a right pick of a game is worth there, unless its owner set the game's own score.
  defaultScore: number;
  // No one joins once it has this many members.
  maxMembers: number;
  // Only games from startDate to endDate ('YYYY-MM-DD', both included; null: no bound) score there.
  startDate: string | null;
  endDate: string | null;
}

// A new group's defaultScore and maxMembers, unless its owner picks others (and the most members a group may have).
export const DEFAULT_GAME_SCORE = 1;
export const MAX_GROUP_MEMBERS = 1000;

// Whether a game scores in a group: its day is within the group's dates.
export const isGameInGroupDates = (
  group: { startDate: string | null; endDate: string | null },
  game: { date: string },
): boolean =>
  (!group.startDate || game.date >= group.startDate) &&
  (!group.endDate || game.date <= group.endDate);

// A game's score in a group, as its owner set it.
export interface GroupGameScoreDto {
  gameId: string;
  score: number;
}

// GET /groups/:id: a group, with who is in it, by name, and each one's score in it (the scores of their right picks),
// and the games whose score its owner set (any other is worth its defaultScore).
export interface GroupDetailsDto extends GroupDto {
  members: { id: string; name: string; score: number }[];
  gameScores: GroupGameScoreDto[];
}

// A game's score in a group is set only until the game is completed (final, or canceled: nothing to score).
export const isGameCompleted = (game: { status: GameStatus }): boolean =>
  game.status === GameStatus.FINAL || game.status === GameStatus.CANCELED;

// GET /groups/:id/games/:gameId/predictions: each member's pick of the game, by name. Until the game locks, only
// whether they picked (`pick` null), so no one copies another's.
export interface GroupMemberPredictionDto {
  id: string;
  name: string;
  picked: boolean;
  pick: PredictionPick | null;
}

// A group's id, in a path.
export const groupIdSchema = string().uuid('id must be a uuid').required();

// A user's id, in a path.
export const userIdSchema = string().uuid('userId must be a uuid').required();

// POST /groups: the signed-in user's new group, which they own.
export const createGroupRequestSchema = object({
  name: string()
    .trim()
    .required('name is required')
    .max(100, 'name must be at most 100 characters'),
  public: boolean()
    .typeError('public must be true or false')
    .required('public is required'),
  defaultScore: number()
    .typeError('defaultScore must be a number')
    .integer('defaultScore must be an integer')
    .min(1, 'defaultScore must be at least 1')
    .max(10, 'defaultScore must be at most 10')
    .default(DEFAULT_GAME_SCORE),
  maxMembers: number()
    .typeError('maxMembers must be a number')
    .integer('maxMembers must be an integer')
    .min(1, 'maxMembers must be at least 1')
    .max(MAX_GROUP_MEMBERS, `maxMembers must be at most ${MAX_GROUP_MEMBERS}`)
    .default(MAX_GROUP_MEMBERS),
  startDate: daySchema.nullable().default(null),
  endDate: daySchema
    .nullable()
    .default(null)
    .test(
      'not-before-start',
      'endDate must not be before startDate',
      (endDate, { parent }) =>
        !endDate || !parent.startDate || endDate >= parent.startDate,
    ),
});
export type CreateGroupRequest = InferType<typeof createGroupRequestSchema>;

// PATCH /groups/:id: its owner edits all of it (a field left out takes its default, as in POST).
export const updateGroupRequestSchema = createGroupRequestSchema;
export type UpdateGroupRequest = CreateGroupRequest;

// PUT /groups/:id/games/:gameId/score: its owner sets what a right pick of the game is worth there.
export const setGameScoreRequestSchema = object({
  score: number()
    .typeError('score must be a number')
    .required('score is required')
    .integer('score must be an integer')
    .min(0, 'score must be at least 0')
    .max(100, 'score must be at most 100'),
});
export type SetGameScoreRequest = InferType<typeof setGameScoreRequestSchema>;
