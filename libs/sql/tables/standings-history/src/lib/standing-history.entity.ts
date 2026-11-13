import { CreateObject } from '@nba/sql-core';
import { StandingColumns, StandingEntity } from '@nba/sql-standings';
import { Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';

// The standings as each day's fetch saw them: a row per day, season and team, so a team's climb (wins, rank, games
// behind) can be read back over a season. `standings` keeps only the latest.
@Entity('standings_history')
@Index(['season', 'teamId', 'date']) // findByTeam
export class StandingHistoryEntity extends StandingColumns {
  // 'YYYY-MM-DD', the league's day (US Eastern) the standings were fetched on.
  @PrimaryColumn({ type: 'date' })
  date!: string;

  // The year it starts in: 2026 is 2026-27.
  @PrimaryColumn({ type: 'integer' })
  season!: number;

  @PrimaryColumn({ type: 'varchar' })
  teamId!: string;

  // The team's row in `standings` (season and team).
  @ManyToOne(() => StandingEntity)
  @JoinColumn([
    { name: 'season', referencedColumnName: 'season' },
    { name: 'team_id', referencedColumnName: 'teamId' },
  ])
  standing?: StandingEntity;
}

export type StandingHistoryCreateObject = CreateObject<
  StandingHistoryEntity,
  'standing'
>;
