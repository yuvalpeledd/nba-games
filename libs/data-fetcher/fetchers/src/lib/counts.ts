import { NO_WRITES, type WriteCounts } from '@nba/sql-core';

// The fetchers' log wording for what a write did: `3 added, 10 updated, 499 unchanged`.
export const describeWrites = ({
  inserted,
  updated,
  unchanged,
}: WriteCounts): string =>
  `${inserted} added, ${updated} updated, ${unchanged} unchanged`;

export const addWrites = (a: WriteCounts, b: WriteCounts): WriteCounts => ({
  inserted: a.inserted + b.inserted,
  updated: a.updated + b.updated,
  unchanged: a.unchanged + b.unchanged,
});

export { NO_WRITES, type WriteCounts };
