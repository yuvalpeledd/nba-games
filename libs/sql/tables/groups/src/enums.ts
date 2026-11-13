// Whether a group is still going; a Deleted one is never read again (its deleted_at hides it).
export enum GroupStatus {
  ACTIVE = 'Active',
  CLOSED = 'Closed',
  DELETED = 'Deleted',
}
