import { Logger, Module } from '@nestjs/common';
import { UserModule } from '@nba/sql-users';
import { initializeApp } from 'firebase-admin/app';
import { Auth, getAuth } from 'firebase-admin/auth';
import { AccessGuard } from './access.guard';
import { firebaseSettings } from './firebase-settings';
import { TokenService } from './token.service';

@Module({
  imports: [UserModule],
  providers: [
    // Checks ID tokens against the project's public keys (no credentials needed); TestApp replaces it with a fake.
    // On the emulator, firebase-admin trusts its unsigned tokens, which it reads from FIREBASE_AUTH_EMULATOR_HOST
    // (set here when firebaseSettings defaults to it; refused in production).
    {
      provide: Auth,
      useFactory: () => {
        const { projectId, emulatorHost } = firebaseSettings();
        if (emulatorHost) {
          process.env['FIREBASE_AUTH_EMULATOR_HOST'] = emulatorHost;
        }
        new Logger('Auth').log(
          `Sign-in through Firebase project ${projectId}${emulatorHost ? `, on the Auth emulator at ${emulatorHost}` : ''}`,
        );
        return getAuth(initializeApp({ projectId }));
      },
    },
    TokenService,
    AccessGuard,
  ],
  exports: [TokenService, AccessGuard],
})
export class FrontendApiAuthModule {}
