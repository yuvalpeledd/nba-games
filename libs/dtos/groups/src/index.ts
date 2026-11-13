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
}

// What a right pick of a game is worth in a group, unless its owner set another score.
export const DEFAULT_GAME_SCORE = 1;

// A game's score in a group, as its owner set it.
export interface GroupGameScoreDto {
  gameId: string;
  score: number;
}

// GET /groups/:id: a group, with who is in it, by name, and each one's score in it (the scores of their right picks),
// and the games whose score its owner set (any other is worth DEFAULT_GAME_SCORE).
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
});
export type CreateGroupRequest = InferType<typeof createGroupRequestSchema>;

// PATCH /groups/:id: its owner renames it or makes it public or private.
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
