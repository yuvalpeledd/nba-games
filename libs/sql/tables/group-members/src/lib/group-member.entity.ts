import { BaseAbstractEntity, CreateObject } from '@nba/sql-core';
import { GroupEntity } from '@nba/sql-groups';
import { UserEntity } from '@nba/sql-users';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

// Who is in a group: a row per group and user, the owner's made with the group.
@Entity('group_members')
@Unique(['groupId', 'userId'])
export class GroupMemberEntity extends BaseAbstractEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  groupId!: string;

  @ManyToOne(() => GroupEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'group_id' })
  group?: GroupEntity;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity;
}

export type GroupMemberCreateObject = CreateObject<
  GroupMemberEntity,
  'id' | 'group' | 'user'
>;
