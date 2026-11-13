import {
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ErrorCode } from '@nba/enums';
import { normalizeEmail, UserDalService, UserEntity } from '@nba/sql-users';
import { Auth } from 'firebase-admin/auth';

// A Firebase account, as its ID token says.
export interface Identity {
  uid: string;
  // As users.email keeps them: trimmed, lower-cased.
  email: string;
  emailVerified: boolean;
}

// 403 EMAIL_NOT_VERIFIED: the web then asks to open the link Firebase emailed.
export function assertEmailVerified({ emailVerified }: Identity): void {
  if (!emailVerified) {
    throw new ForbiddenException({
      statusCode: 403,
      message: 'Verify your email address first',
      code: ErrorCode.EMAIL_NOT_VERIFIED,
    });
  }
}

// Firebase ID tokens to users, linked by `users.firebase_uid`.
// ponytail: a users lookup per signed-in call (no cache); cache it per uid if it shows in the latency.
@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  constructor(
    private readonly auth: Auth,
    private readonly users: UserDalService,
  ) {}

  // 401 for any token Firebase refuses (expired, another project's, malformed) and for one without an email.
  // ponytail: firebase-admin reports failing to fetch Google's public keys like a bad token, so a Google outage is a
  // 401 too, which signs the web out. Tell them apart if it happens.
  async verifyIdentity(token: string): Promise<Identity> {
    const decoded = await this.auth.verifyIdToken(token).catch(() => null);
    if (!decoded?.email) {
      throw new UnauthorizedException('Invalid or expired token');
    }
    return {
      uid: decoded.uid,
      email: normalizeEmail(decoded.email),
      emailVerified: decoded.email_verified === true,
    };
  }

  // The user of a signed-in call: 403 EMAIL_NOT_VERIFIED until the account's email is verified, 401 when no user is
  // linked to the account (its sign-up never finished).
  async verifyAccessToken(token: string): Promise<UserEntity> {
    const identity = await this.verifyIdentity(token);
    assertEmailVerified(identity);
    const user = await this.linkedUser(identity);
    if (!user) throw new UnauthorizedException('Invalid or expired token');
    return user;
  }

  // The user linked to the account, whose email follows the account's (changed through Firebase).
  async linkedUser(identity: Identity): Promise<UserEntity | null> {
    const user = await this.users.findByFirebaseUid(identity.uid);
    if (user && user.email !== identity.email) {
      await this.moveEmail(user, identity.email);
    }
    return user;
  }

  // ponytail: an email another user has stays theirs, and this user keeps their old one (users.email is unique);
  // merge the two if it happens.
  private async moveEmail(user: UserEntity, email: string): Promise<void> {
    const holder = await this.users.findByEmail(email);
    if (holder) {
      this.logger.warn(
        `User ${user.id} changed their email to user ${holder.id}'s: kept the old one`,
      );
      return;
    }
    await this.users.updateEmail(user.id, email);
    user.email = email;
    this.logger.log(`User ${user.id} changed their email through Firebase`);
  }
}
