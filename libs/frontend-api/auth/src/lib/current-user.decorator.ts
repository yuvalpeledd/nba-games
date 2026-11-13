import {
  createParamDecorator,
  ExecutionContext,
  InternalServerErrorException,
} from '@nestjs/common';
import type { UserEntity } from '@nba/sql-users';
import { AuthRequest } from './access.guard';

// The caller, as AccessGuard loaded them.
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): UserEntity => {
    const { user } = context.switchToHttp().getRequest<AuthRequest>();
    if (!user) {
      throw new InternalServerErrorException(
        '@CurrentUser() needs AccessGuard on the route',
      );
    }
    return user;
  },
);
