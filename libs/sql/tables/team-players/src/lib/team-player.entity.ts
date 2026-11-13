import { BaseAbstractEntity, CreateObject } from '@nba/sql-core';
import { PlayerEntity } from '@nba/sql-players';
import { TeamEntity } from '@nba/sql-teams';
import { Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';

// Who was on which team, day by day: a row for each day a roster fetch (GET /v1/basketballplayers) saw the player on
// the team. A trade shows as the player's days moving from one team to the next; `players.team_id` is only today's.
@Entity('team_players')
@Index(['playerId', 'date']) // findByPlayerId
export class TeamPlayerEntity extends BaseAbstractEntity {
  // 'YYYY-MM-DD', the league's day (US Eastern) the roster was fetched on.
  @PrimaryColumn({ type: 'date' })
  date!: string;

  @PrimaryColumn({ type: 'varchar' })
  teamId!: string;

  @ManyToOne(() => TeamEntity)
  @JoinColumn({ name: 'team_id' })
  team?: TeamEntity;

  @PrimaryColumn({ type: 'varchar' })
  playerId!: string;

  @ManyToOne(() => PlayerEntity)
  @JoinColumn({ name: 'player_id' })
  player?: PlayerEntity;
}

export type TeamPlayerCreateObject = CreateObject<
  TeamPlayerEntity,
  'team' | 'player'
>;
