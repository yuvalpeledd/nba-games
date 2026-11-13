import { BaseAbstractEntity, CreateObject } from '@nba/sql-core';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

// The data-fetcher's runs (data-fetcher.md): a row per run, written when it ends, failed ones too, so the last one
// says when the data was fetched and how it went. A run that never got to its fetchers (pending migrations, no DB)
// writes none.
@Entity('scans')
export class ScanEntity extends BaseAbstractEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'timestamptz' })
  startedAt!: Date;

  @Column({ type: 'timestamptz' })
  finishedAt!: Date;

  // Every fetcher succeeded.
  @Column({ type: 'boolean' })
  success!: boolean;

  // The rows the fetchers wrote to the NBA tables (teams, players, standings, games; not the per-day history), summed
  // over the fetchers that succeeded.
  @Column({ type: 'integer' })
  inserted!: number;

  @Column({ type: 'integer' })
  updated!: number;

  @Column({ type: 'integer' })
  unchanged!: number;

  // The failed fetchers' errors, a line each (`GamesFetcherService: Games failed for 2026-11-11`); null when none.
  @Column({ type: 'text', nullable: true })
  error!: string | null;
}

export type ScanCreateObject = CreateObject<ScanEntity, 'id'>;
