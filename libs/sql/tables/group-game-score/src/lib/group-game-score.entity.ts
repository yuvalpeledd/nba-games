import { BaseAbstractEntity, CreateObject } from '@nba/sql-core';
import { GameEntity } from '@nba/sql-games';
import { GroupEntity } from '@nba/sql-groups';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

// What a right pick of a game is worth in a group, set by its owner: a row per group and game it set (any other game
// is worth the group's default_score).
@Entity('group_game_score')
@Unique(['groupId', 'gameId'])
export class GroupGameScoreEntity extends BaseAbstractEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  groupId!: string;

  @ManyToOne(() => GroupEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'group_id' })
  group?: GroupEntity;

  @Column({ type: 'varchar' })
  gameId!: string;

  @ManyToOne(() => GameEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'game_id' })
  game?: GameEntity;

  @Column({ type: 'int' })
  score!: number;
}

export type GroupGameScoreCreateObject = CreateObject<
  GroupGameScoreEntity,
  'id' | 'group' | 'game'
>;
