import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { DataResponse } from '@nba/dtos';
import {
  type FirebaseConfigDto,
  type LoginRequest,
  loginRequestSchema,
  type SessionDto,
  type SignUpRequest,
  signUpRequestSchema,
  type UserDto,
} from '@nba/dtos-auth';
import { YupPipe } from '@nba/frontend-api-common';
import {
  AccessGuard,
  CurrentUser,
  firebaseSettings,
} from '@nba/frontend-api-auth';
import type { UserEntity } from '@nba/sql-users';
import { AuthService } from './auth.service';

// Where sessions start: Firebase signs people in (the web), and /login and /sign-up take its ID token in the body.
@Controller()
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @HttpCode(200)
  async login(
    @Body(new YupPipe(loginRequestSchema)) { idToken }: LoginRequest,
  ): Promise<DataResponse<SessionDto>> {
    return { data: await this.auth.userFor(idToken) };
  }

  @Post('sign-up')
  async signUp(
    @Body(new YupPipe(signUpRequestSchema)) { idToken, name }: SignUpRequest,
  ): Promise<DataResponse<SessionDto>> {
    return { data: await this.auth.userFor(idToken, name) };
  }

  @Get('me')
  @UseGuards(AccessGuard)
  me(@CurrentUser() { id, name, email }: UserEntity): DataResponse<UserDto> {
    return { data: { id, name, email } };
  }

  // What the web needs before anyone signs in: the server's env, so one web build serves every environment.
  @Get('firebase-config')
  firebaseConfig(): DataResponse<FirebaseConfigDto> {
    const { apiKey, authDomain } = firebaseSettings();
    return { data: { apiKey, authDomain } };
  }
}
