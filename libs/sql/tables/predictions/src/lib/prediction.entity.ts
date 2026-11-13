import { BaseAbstractEntity, CreateObject } from '@nba/sql-core';
import { GameEntity } from '@nba/sql-games';
import { UserEntity } from '@nba/sql-users';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { PredictionPick } from '../enums';

// A user's pick of a game's winner: a row per user and game, written only before the game starts
// (PUT /predictions/:gameId).
@Entity('predictions')
@Unique(['userId', 'gameId'])
export class PredictionEntity extends BaseAbstractEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

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

  // Null: no prediction (the user took theirs back).
  @Column({ type: 'enum', enum: PredictionPick, nullable: true })
  pick!: PredictionPick | null;
}

export type PredictionCreateObject = CreateObject<
  PredictionEntity,
  'id' | 'user' | 'game'
>;
