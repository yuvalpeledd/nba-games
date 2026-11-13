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
    {
      provide: Auth,
      useFactory: () => {
        const { projectId } = firebaseSettings();
        new Logger('Auth').log(`Sign-in through Firebase project ${projectId}`);
        return getAuth(initializeApp({ projectId }));
      },
    },
    TokenService,
    AccessGuard,
  ],
  exports: [TokenService, AccessGuard],
})
export class FrontendApiAuthModule {}
