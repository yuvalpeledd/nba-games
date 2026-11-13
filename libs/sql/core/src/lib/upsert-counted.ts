import type {
  EntityManager,
  EntityTarget,
  ObjectLiteral,
  QueryDeepPartialEntity,
} from 'typeorm';

// What a write did to the rows it was given.
export interface WriteCounts {
  inserted: number;
  updated: number;
  unchanged: number;
}

export const NO_WRITES: WriteCounts = { inserted: 0, updated: 0, unchanged: 0 };

// `repo.upsert`, counting what it did: inserts the new rows and updates the known ones (by `conflictPaths`, property
// names) only where a value differs, so an unchanged row isn't touched (its `updated_at` stays). Postgres returns
// only the rows it wrote, and `xmax = 0` marks those it inserted.
export async function upsertCounted<T extends ObjectLiteral>(
  manager: EntityManager,
  target: EntityTarget<T>,
  rows: QueryDeepPartialEntity<T>[],
  conflictPaths: string[],
): Promise<WriteCounts> {
  if (!rows.length) return NO_WRITES;
  const { columns } = manager.connection.getMetadata(target);
  const conflict = columns
    .filter((column) => conflictPaths.includes(column.propertyName))
    .map((column) => column.databaseName);
  const overwrite = columns
    .filter(
      (column) =>
        !conflictPaths.includes(column.propertyName) &&
        !column.isCreateDate &&
        !column.isUpdateDate,
    )
    .map((column) => column.databaseName);

  const { raw } = await manager
    .createQueryBuilder()
    .insert()
    .into(target)
    .values(rows)
    .orUpdate(overwrite, conflict, { skipUpdateIfNoValuesChanged: true })
    .returning('(xmax = 0) AS inserted')
    .execute();
  const written = raw as { inserted: boolean }[];
  const inserted = written.filter((row) => row.inserted).length;
  return {
    inserted,
    updated: written.length - inserted,
    unchanged: rows.length - written.length,
  };
}
