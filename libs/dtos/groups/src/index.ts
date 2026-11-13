import type { GroupStatus } from '@nba/sql-groups/enums';
import type { PredictionPick } from '@nba/sql-predictions/enums';
import { boolean, InferType, object, string } from 'yup';

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

// GET /groups/:id: a group, with who is in it, by name, and each one's score in it (a point per right pick).
export interface GroupDetailsDto extends GroupDto {
  members: { id: string; name: string; score: number }[];
}

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
