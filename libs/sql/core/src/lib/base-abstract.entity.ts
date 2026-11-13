import { CreateDateColumn, UpdateDateColumn } from 'typeorm';

// Every entity extends this. No soft delete: NBA data is never deleted (data-fetcher.md).
export abstract class BaseAbstractEntity {
  @CreateDateColumn({ type: 'timestamptz' })
  public createdAt?: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  public updatedAt?: Date;
}

// Fields a caller passes to `create` / `upsert`: everything except the timestamps and the listed relations.
export type CreateObject<
  T extends BaseAbstractEntity,
  Generated extends keyof T = never,
> = Omit<T, keyof BaseAbstractEntity | Generated>;
