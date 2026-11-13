import { BaseAbstractEntity, CreateObject } from '@nba/sql-core';
import { Column, Entity, PrimaryColumn } from 'typeorm';

// The league's seasons, loaded by migrations (one per season, see features.md's Seasons): the provider has no
// endpoint for them.
@Entity('seasons')
export class SeasonEntity extends BaseAbstractEntity {
  // `nba-2026-27`
  @PrimaryColumn({ type: 'varchar' })
  id!: string;

  // `NBA 2026-2027`
  @Column({ type: 'varchar' })
  name!: string;

  // 'YYYY-MM-DD', the regular season's first and last days.
  @Column({ type: 'date' })
  startDate!: string;

  @Column({ type: 'date' })
  endDate!: string;
}

export type SeasonCreateObject = CreateObject<SeasonEntity>;
