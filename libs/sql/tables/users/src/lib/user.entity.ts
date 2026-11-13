import { BaseAbstractEntity, CreateObject } from '@nba/sql-core';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

// Who signs in (Firebase keeps the password): a row per Firebase account, made by signing up (POST /sign-up).
@Entity('users')
export class UserEntity extends BaseAbstractEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 255 })
  name!: string;

  // Stored lower-cased by UserDalService, so uniqueness is case-insensitive. Follows the Firebase account's
  // (TokenService), which is the login.
  @Column({ length: 255, unique: true })
  email!: string;

  // The Firebase (Identity Platform) account they sign in with.
  @Column({ length: 128, unique: true })
  firebaseUid!: string;
}

export type UserCreateObject = CreateObject<UserEntity, 'id'>;
