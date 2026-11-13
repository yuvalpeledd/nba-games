// The Identity Platform (Firebase Auth) project that signs users in, and what the web needs to reach it.
export interface FirebaseSettings {
  projectId: string;
  // A browser key: public by design (it names the project); its restrictions are what limit it.
  apiKey: string;
  authDomain: string;
}

// The dev project, which local runs sign in against (local sign-ups are real accounts there).
const DEV = {
  projectId: 'yuval-nba-test',
  authDomain: 'yuval-nba-test.firebaseapp.com',
};

// From the env: production must set all three; elsewhere the dev project, whose web API key (FIREBASE_API_KEY, in
// .env) is still required. Throws for a missing value, so a misconfigured run fails to boot instead of refusing
// every token.
export function firebaseSettings(env = process.env): FirebaseSettings {
  const {
    NODE_ENV,
    GOOGLE_CLOUD_PROJECT,
    FIREBASE_API_KEY,
    FIREBASE_AUTH_DOMAIN,
  } = env;
  if (
    NODE_ENV === 'production' &&
    (!GOOGLE_CLOUD_PROJECT || !FIREBASE_API_KEY || !FIREBASE_AUTH_DOMAIN)
  ) {
    throw new Error(
      'GOOGLE_CLOUD_PROJECT, FIREBASE_API_KEY and FIREBASE_AUTH_DOMAIN are required in production',
    );
  }
  if (!FIREBASE_API_KEY) {
    throw new Error(
      `FIREBASE_API_KEY is required: the web API key of Firebase project ${DEV.projectId} (Project settings > General), in .env`,
    );
  }
  return {
    projectId: GOOGLE_CLOUD_PROJECT || DEV.projectId,
    apiKey: FIREBASE_API_KEY,
    authDomain: FIREBASE_AUTH_DOMAIN || DEV.authDomain,
  };
}
