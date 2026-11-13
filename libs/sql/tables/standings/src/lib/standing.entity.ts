import { BaseAbstractEntity, CreateObject } from '@nba/sql-core';
import { TeamEntity } from '@nba/sql-teams';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';

// GET /v1/basketballstandings?league=nba&season=<year>: one row per team per season.
@Entity('standings')
export class StandingEntity extends BaseAbstractEntity {
  // The year it starts in: 2026 is 2026-27.
  @PrimaryColumn({ type: 'integer' })
  season!: number;

  @PrimaryColumn({ type: 'varchar' })
  teamId!: string;

  @ManyToOne(() => TeamEntity)
  @JoinColumn({ name: 'team_id' })
  team?: TeamEntity;

  // The team's that season (a team can change division).
  @Column({ type: 'varchar' })
  conference!: string;

  @Column({ type: 'varchar' })
  division!: string;

  @Column({ type: 'integer' })
  gamesPlayed!: number;

  @Column({ type: 'integer' })
  wins!: number;

  @Column({ type: 'integer' })
  losses!: number;

  @Column({ type: 'double precision' })
  winPct!: number;

  // From the division's leader; can be a half.
  @Column({ type: 'double precision' })
  gamesBehind!: number;

  @Column({ type: 'integer' })
  pointsFor!: number;

  @Column({ type: 'integer' })
  pointsAgainst!: number;

  @Column({ type: 'integer' })
  pointDifferential!: number;

  // ponytail: the records are kept as the provider writes them (`W7`, `5-1`); split into numbers when something sorts by them.
  @Column({ type: 'varchar' })
  streak!: string;

  @Column({ type: 'varchar' })
  homeRecord!: string;

  @Column({ type: 'varchar' })
  awayRecord!: string;

  @Column({ type: 'varchar' })
  divisionRecord!: string;

  @Column({ type: 'varchar' })
  conferenceRecord!: string;

  @Column({ type: 'varchar' })
  last10!: string;

  @Column({ type: 'integer' })
  leagueRank!: number;

  // The playoff seed.
  @Column({ type: 'integer' })
  conferenceRank!: number;

  @Column({ type: 'integer' })
  divisionRank!: number;

  // The season is over: these are its final standings.
  @Column({ type: 'boolean' })
  final!: boolean;
}

export type StandingCreateObject = CreateObject<StandingEntity, 'team'>;
