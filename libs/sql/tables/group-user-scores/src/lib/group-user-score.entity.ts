import { BaseAbstractEntity, CreateObject } from '@nba/sql-core';
import { GameEntity } from '@nba/sql-games';
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

// A member's score for a game in a group: 1 if their prediction was right, 0 if wrong; a row per group, user and game,
// written by score-manager when it checks the game.
@Entity('group_user_scores')
@Unique(['groupId', 'userId', 'gameId'])
export class GroupUserScoreEntity extends BaseAbstractEntity {
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

  @Column({ type: 'varchar' })
  gameId!: string;

  @ManyToOne(() => GameEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'game_id' })
  game?: GameEntity;

  @Column({ type: 'int' })
  score!: number;
}

export type GroupUserScoreCreateObject = CreateObject<
  GroupUserScoreEntity,
  'id' | 'group' | 'user' | 'game'
>;
