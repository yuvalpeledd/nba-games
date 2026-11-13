import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { UserEntity } from '@nba/sql-users';
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

// Signed-in routes (`@UseGuards(AccessGuard)`): the bearer token's user, for @CurrentUser(). Everyone is a plain user:
// no roles yet.
@Injectable()
export class AccessGuard implements CanActivate {
  constructor(private readonly tokens: TokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    request.user = await this.tokens.verifyAccessToken(bearerToken(request));
    return true;
  }
}
