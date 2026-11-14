import { BaseAbstractEntity, CreateObject } from '@nba/sql-core';
import { UserEntity } from '@nba/sql-users';
import {
  Column,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { GroupStatus } from '../enums';

// Users who play together: made by its owner (POST /groups), its first member (group_members).
@Entity('groups')
export class GroupEntity extends BaseAbstractEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 100 })
  name!: string;

  @Column({ type: 'uuid' })
  ownerId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'owner_id' })
  owner?: UserEntity;

  // Every user sees a public group; a private one only its members.
  @Column()
  public!: boolean;

  // What a right pick of a game is worth here (1-10), unless its owner set the game's own (group_game_score).
  @Column({ type: 'integer', default: 1 })
  defaultScore!: number;

  // No one joins once it has this many members (up to 1000).
  @Column({ type: 'integer', default: 1000 })
  maxMembers!: number;

  // Only games from startDate to endDate ('YYYY-MM-DD', both included; null: no bound) score here.
  @Column({ type: 'date', nullable: true })
  startDate!: string | null;

  @Column({ type: 'date', nullable: true })
  endDate!: string | null;

  @Column({ type: 'enum', enum: GroupStatus, default: GroupStatus.ACTIVE })
  status!: GroupStatus;

  // Set with status Deleted (soft delete): TypeORM leaves rows that have it out of every read.
  @DeleteDateColumn({ type: 'timestamptz' })
  deletedAt?: Date | null;
}

// The settings have defaults (the columns').
type GroupSettings = 'defaultScore' | 'maxMembers' | 'startDate' | 'endDate';
export type GroupCreateObject = CreateObject<
  GroupEntity,
  'id' | 'owner' | 'status' | 'deletedAt' | GroupSettings
> &
  Partial<Pick<GroupEntity, GroupSettings>>;
