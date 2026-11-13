import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { UserEntity } from '@nba/sql-users';
import { PUBLIC_KEY } from './public.decorator';
import { TokenService } from './token.service';

export interface AuthRequest {
  headers: { authorization?: string };
  user?: UserEntity;
}

const bearerToken = ({ headers }: AuthRequest): string => {
  const [scheme, token] = headers.authorization?.split(' ') ?? [];
  if (scheme !== 'Bearer' || !token) {
    throw new UnauthorizedException('Missing bearer token');
  }
  return token;
};

// Every route but a @Public() one (it's global, APP_GUARD): the bearer token's user, for @CurrentUser(). Everyone is a
// plain user: no roles yet.
@Injectable()
export class AccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: TokenService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean | undefined>(
      PUBLIC_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (isPublic) return true;
    const request = context.switchToHttp().getRequest<AuthRequest>();
    request.user = await this.tokens.verifyAccessToken(bearerToken(request));
    return true;
  }
}
