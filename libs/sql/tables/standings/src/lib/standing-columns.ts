import { BaseAbstractEntity } from '@nba/sql-core';
import { Column } from 'typeorm';

// A team's standing, as GET /v1/basketballstandings gives it: the columns `standings` (the latest) and
// `standings_history` (a row a day) share.
export abstract class StandingColumns extends BaseAbstractEntity {
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
