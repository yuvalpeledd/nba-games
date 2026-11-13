import { BaseAbstractEntity, CreateObject, Venue } from '@nba/sql-core';
import { Column, Entity, PrimaryColumn } from 'typeorm';

// GET /v1/basketballteams?league=nba
@Entity('teams')
export class TeamEntity extends BaseAbstractEntity {
  // The provider's team_id: `nba-por`.
  @PrimaryColumn({ type: 'varchar' })
  id!: string;

  // `POR`
  @Column({ type: 'varchar' })
  abbreviation!: string;

  // `Portland Trail Blazers`
  @Column({ type: 'varchar' })
  name!: string;

  // `Trail Blazers`
  @Column({ type: 'varchar' })
  nickname!: string;

  @Column({ type: 'varchar' })
  city!: string;

  // `Eastern` / `Western`. Text, not an enum: the provider's own words, and they never change.
  @Column({ type: 'varchar' })
  conference!: string;

  // `Northwest`
  @Column({ type: 'varchar' })
  division!: string;

  @Column({ type: 'jsonb' })
  venue!: Venue;

  // False for a franchise that moved or folded (past seasons' New Jersey Nets).
  @Column({ type: 'boolean' })
  active!: boolean;
}

export type TeamCreateObject = CreateObject<TeamEntity>;
