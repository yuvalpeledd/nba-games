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

  @Column({ type: 'enum', enum: GroupStatus, default: GroupStatus.ACTIVE })
  status!: GroupStatus;

  // Set with status Deleted (soft delete): TypeORM leaves rows that have it out of every read.
  @DeleteDateColumn({ type: 'timestamptz' })
  deletedAt?: Date | null;
}

export type GroupCreateObject = CreateObject<
  GroupEntity,
  'id' | 'owner' | 'status' | 'deletedAt'
>;
