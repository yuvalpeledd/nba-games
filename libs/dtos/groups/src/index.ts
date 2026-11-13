import type { GroupStatus } from '@nba/sql-groups/enums';
import { boolean, InferType, object, string } from 'yup';

export interface GroupDto {
  id: string;
  name: string;
  public: boolean;
  status: GroupStatus;
  owner: { id: string; name: string };
  memberCount: number;
}

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
