import { BaseAbstractEntity, CreateObject, Venue } from '@nba/sql-core';
import { TeamEntity } from '@nba/sql-teams';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { GameStatus, SeasonType } from '../enums';

export interface PeriodScores {
  // One per period, overtimes included.
  home: number[];
  away: number[];
}

// GET /v1/basketballgames?league=nba&date=<YYYY-MM-DD>
@Entity('games')
@Index(['date']) // findByDate
export class GameEntity extends BaseAbstractEntity {
  // The provider's game_id: `nba-20261111-bos-tor` (league, date, away, home).
  @PrimaryColumn({ type: 'varchar' })
  id!: string;

  // The year it starts in: 2026 is 2026-27.
  @Column({ type: 'integer' })
  season!: number;

  @Column({ type: 'enum', enum: SeasonType })
  seasonType!: SeasonType;

  // 'YYYY-MM-DD', the day the league lists it on (US Eastern): a 7 PM ET game starts the next day in UTC.
  @Column({ type: 'date' })
  date!: string;

  @Column({ type: 'timestamptz' })
  startTime!: Date;

  @Column({ type: 'enum', enum: GameStatus })
  status!: GameStatus;

  // The provider's words for a status (`Halftime`, `End of 3rd`).
  @Column({ type: 'varchar', nullable: true })
  statusDetail!: string | null;

  // Live games (a paid plan): the period and its clock.
  @Column({ type: 'integer', nullable: true })
  period!: number | null;

  @Column({ type: 'varchar', nullable: true })
  clock!: string | null;

  @Column({ type: 'varchar' })
  homeTeamId!: string;

  @ManyToOne(() => TeamEntity)
  @JoinColumn({ name: 'home_team_id' })
  homeTeam?: TeamEntity;

  @Column({ type: 'varchar' })
  awayTeamId!: string;

  @ManyToOne(() => TeamEntity)
  @JoinColumn({ name: 'away_team_id' })
  awayTeam?: TeamEntity;

  // Null until it starts.
  @Column({ type: 'integer', nullable: true })
  homeScore!: number | null;

  @Column({ type: 'integer', nullable: true })
  awayScore!: number | null;

  @Column({ type: 'jsonb', nullable: true })
  periodScores!: PeriodScores | null;

  // `regulation`, `overtime`, ... once final (text: the provider's values aren't documented).
  @Column({ type: 'varchar', nullable: true })
  decidedIn!: string | null;

  @Column({ type: 'varchar', nullable: true })
  winnerTeamId!: string | null;

  @ManyToOne(() => TeamEntity)
  @JoinColumn({ name: 'winner_team_id' })
  winnerTeam?: TeamEntity | null;

  @Column({ type: 'jsonb', nullable: true })
  venue!: Venue | null;

  @Column({ type: 'boolean' })
  neutralSite!: boolean;

  // A postponed game's first date ('YYYY-MM-DD').
  @Column({ type: 'date', nullable: true })
  originalDate!: string | null;
}

export type GameCreateObject = CreateObject<
  GameEntity,
  'homeTeam' | 'awayTeam' | 'winnerTeam'
>;
