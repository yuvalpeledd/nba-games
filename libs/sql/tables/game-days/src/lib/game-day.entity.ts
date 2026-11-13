import { BaseAbstractEntity, CreateObject } from '@nba/sql-core';
import { Column, Entity, PrimaryColumn } from 'typeorm';

// The days the games fetcher has checked (GET /v1/basketballgames?date=), how many games each had and when: so a day
// without games (Thanksgiving, the All-Star break) is asked for once, not on every run. Written by the games
// fetcher only, a row per day it fetched, empty days included; a failed fetch writes none.
@Entity('game_days')
export class GameDayEntity extends BaseAbstractEntity {
  // 'YYYY-MM-DD', the league's day (US Eastern).
  @PrimaryColumn({ type: 'date' })
  date!: string;

  // How many games the provider listed that day, at the last check.
  @Column({ type: 'integer' })
  games!: number;

  // The league's day it was last checked on: a day checked before it came may still get games scheduled.
  @Column({ type: 'date' })
  checkedOn!: string;
}

export type GameDayCreateObject = CreateObject<GameDayEntity>;
