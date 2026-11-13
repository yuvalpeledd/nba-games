import { BaseAbstractEntity, CreateObject } from '@nba/sql-core';
import { TeamEntity } from '@nba/sql-teams';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';

export interface BirthPlace {
  city: string | null;
  state: string | null;
  country: string | null;
}

// GET /v1/basketballplayers?league=nba&team=<team id>: one row per player, on their current team.
@Entity('players')
@Index(['teamId']) // findByTeamId
export class PlayerEntity extends BaseAbstractEntity {
  // The provider's player_id: `nba-p-121d86716a`.
  @PrimaryColumn({ type: 'varchar' })
  id!: string;

  // Null for a player on no roster.
  @Column({ type: 'varchar', nullable: true })
  teamId!: string | null;

  @ManyToOne(() => TeamEntity)
  @JoinColumn({ name: 'team_id' })
  team?: TeamEntity | null;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'varchar' })
  firstName!: string;

  @Column({ type: 'varchar' })
  lastName!: string;

  // `G`, `F`, `C` (text: the provider may combine them)
  @Column({ type: 'varchar', nullable: true })
  position!: string | null;

  // Text: `00` isn't `0`.
  @Column({ type: 'varchar', nullable: true })
  jerseyNumber!: string | null;

  // ponytail: imperial only; centimeters and kilograms are a conversion away.
  @Column({ type: 'integer', nullable: true })
  heightIn!: number | null;

  @Column({ type: 'integer', nullable: true })
  weightLb!: number | null;

  // 'YYYY-MM-DD'
  @Column({ type: 'date', nullable: true })
  birthDate!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  birthPlace!: BirthPlace | null;

  // `active`, as the provider says it (text: its other values aren't documented).
  @Column({ type: 'varchar' })
  rosterStatus!: string;

  @Column({ type: 'varchar', nullable: true })
  college!: string | null;

  @Column({ type: 'integer', nullable: true })
  experienceYears!: number | null;
}

export type PlayerCreateObject = CreateObject<PlayerEntity, 'team'>;
