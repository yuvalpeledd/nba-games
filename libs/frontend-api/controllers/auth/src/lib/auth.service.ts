import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { SessionDto } from '@nba/dtos-auth';
import { ErrorCode } from '@nba/enums';
import { assertEmailVerified, TokenService } from '@nba/frontend-api-auth';
import { UserDalService } from '@nba/sql-users';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UserDalService,
    private readonly tokens: TokenService,
  ) {}

  // The user of a Firebase account whose email is verified (403 EMAIL_NOT_VERIFIED until then): the one linked to
  // it, else, signing up (with `name`), a new one. Logging in finds none: 404 (the web asks for a name, then signs
  // up). An email another account's user has is 409 USER_EXISTS.
  async userFor(idToken: string, name?: string): Promise<SessionDto> {
    const identity = await this.tokens.verifyIdentity(idToken);
    assertEmailVerified(identity);
    const linked = await this.tokens.linkedUser(identity);
    if (linked) return { userId: linked.id };
    if (name === undefined) {
      throw new NotFoundException('No user for this account yet: sign up');
    }
    if (await this.users.findByEmail(identity.email)) {
      throw new ConflictException({
        statusCode: 409,
        message: 'This email belongs to another account',
        code: ErrorCode.USER_EXISTS,
      });
    }
    // ponytail: two sign-ups of one new account at once hit the unique email (500); map it to 409 if it shows up.
    const user = await this.users.create({
      name,
      email: identity.email,
      firebaseUid: identity.uid,
    });
    return { userId: user.id };
  }
}
