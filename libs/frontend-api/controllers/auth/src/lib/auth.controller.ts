import { Body, Controller, Get, HttpCode, Patch, Post } from '@nestjs/common';
import type { DataResponse } from '@nba/dtos';
import {
  type FirebaseConfigDto,
  type LoginRequest,
  loginRequestSchema,
  type SessionDto,
  type SignUpRequest,
  signUpRequestSchema,
  type UpdateMeRequest,
  updateMeRequestSchema,
  type UserDto,
} from '@nba/dtos-auth';
import { YupPipe } from '@nba/frontend-api-common';
import { CurrentUser, firebaseSettings, Public } from '@nba/frontend-api-auth';
import { type UserEntity, UserDalService } from '@nba/sql-users';
import { AuthService } from './auth.service';

// Where sessions start: Firebase signs people in (the web), and /login and /sign-up take its ID token in the body.
// They and /firebase-config are public; /me (GET, and PATCH to rename), like every other route, needs a signed-in caller (AccessGuard).
@Controller()
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly users: UserDalService,
  ) {}

  @Post('login')
  @Public()
  @HttpCode(200)
  async login(
    @Body(new YupPipe(loginRequestSchema)) { idToken }: LoginRequest,
  ): Promise<DataResponse<SessionDto>> {
    return { data: await this.auth.userFor(idToken) };
  }

  @Post('sign-up')
  @Public()
  async signUp(
    @Body(new YupPipe(signUpRequestSchema)) { idToken, name }: SignUpRequest,
  ): Promise<DataResponse<SessionDto>> {
    return { data: await this.auth.userFor(idToken, name) };
  }

  @Get('me')
  me(@CurrentUser() { id, name, email }: UserEntity): DataResponse<UserDto> {
    return { data: { id, name, email } };
  }

  // Renames the caller.
  @Patch('me')
  async updateMe(
    @CurrentUser() { id, email }: UserEntity,
    @Body(new YupPipe(updateMeRequestSchema)) { name }: UpdateMeRequest,
  ): Promise<DataResponse<UserDto>> {
    await this.users.updateName(id, name);
    return { data: { id, name, email } };
  }

  // What the web needs before anyone signs in: the server's env, so one web build serves every environment.
  @Get('firebase-config')
  @Public()
  firebaseConfig(): DataResponse<FirebaseConfigDto> {
    const { apiKey, authDomain } = firebaseSettings();
    return { data: { apiKey, authDomain } };
  }
}
