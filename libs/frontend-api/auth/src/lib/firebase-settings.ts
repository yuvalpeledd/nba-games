// The Identity Platform (Firebase Auth) project that signs users in, and what the web needs to reach it.
export interface FirebaseSettings {
  projectId: string;
  // A browser key: public by design (it names the project); its restrictions are what limit it.
  apiKey: string;
  authDomain: string;
  // Firebase's Auth emulator (host:port), which firebase-admin then trusts without signatures: never in production.
  emulatorHost: string | null;
}

// No Firebase project of its own yet: locally, without FIREBASE_API_KEY, sign-in runs on the Auth emulator
// (`pnpm firebase:emulator`) under a demo project, which needs no account and keeps nothing.
const EMULATOR: FirebaseSettings = {
  projectId: 'demo-nba',
  apiKey: 'demo-key',
  authDomain: 'demo-nba.firebaseapp.com',
  emulatorHost: '127.0.0.1:9099',
};

// From the env, which production must set; elsewhere the emulator unless FIREBASE_API_KEY names a real project.
// Throws in production for a missing value or the emulator, so a misconfigured deploy fails to boot instead of
// refusing every token.
export function firebaseSettings(env = process.env): FirebaseSettings {
  const {
    NODE_ENV,
    GOOGLE_CLOUD_PROJECT,
    FIREBASE_API_KEY,
    FIREBASE_AUTH_DOMAIN,
    FIREBASE_AUTH_EMULATOR_HOST,
  } = env;
  if (NODE_ENV === 'production') {
    if (!GOOGLE_CLOUD_PROJECT || !FIREBASE_API_KEY || !FIREBASE_AUTH_DOMAIN) {
      throw new Error(
        'GOOGLE_CLOUD_PROJECT, FIREBASE_API_KEY and FIREBASE_AUTH_DOMAIN are required in production',
      );
    }
    if (FIREBASE_AUTH_EMULATOR_HOST) {
      throw new Error(
        'FIREBASE_AUTH_EMULATOR_HOST must be unset in production: with it, unsigned tokens pass',
      );
    }
  }
  if (!FIREBASE_API_KEY) {
    return {
      ...EMULATOR,
      emulatorHost: FIREBASE_AUTH_EMULATOR_HOST || EMULATOR.emulatorHost,
    };
  }
  if (!GOOGLE_CLOUD_PROJECT || !FIREBASE_AUTH_DOMAIN) {
    throw new Error(
      'FIREBASE_API_KEY needs GOOGLE_CLOUD_PROJECT and FIREBASE_AUTH_DOMAIN too',
    );
  }
  return {
    projectId: GOOGLE_CLOUD_PROJECT,
    apiKey: FIREBASE_API_KEY,
    authDomain: FIREBASE_AUTH_DOMAIN,
    emulatorHost: FIREBASE_AUTH_EMULATOR_HOST || null,
  };
}
