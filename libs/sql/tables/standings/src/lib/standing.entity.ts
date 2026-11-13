import { CreateObject } from '@nba/sql-core';
import { TeamEntity } from '@nba/sql-teams';
import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { StandingColumns } from './standing-columns';

// GET /v1/basketballstandings?league=nba&season=<year>: one row per team per season, the latest fetched. Each day's
// are kept in `standings_history`.
@Entity('standings')
export class StandingEntity extends StandingColumns {
  // The year it starts in: 2026 is 2026-27.
  @PrimaryColumn({ type: 'integer' })
  season!: number;

  @PrimaryColumn({ type: 'varchar' })
  teamId!: string;

  @ManyToOne(() => TeamEntity)
  @JoinColumn({ name: 'team_id' })
  team?: TeamEntity;
}

export type StandingCreateObject = CreateObject<StandingEntity, 'team'>;
