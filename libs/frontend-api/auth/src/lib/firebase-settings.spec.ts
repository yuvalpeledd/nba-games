import { firebaseSettings } from './firebase-settings';

const production = {
  NODE_ENV: 'production',
  GOOGLE_CLOUD_PROJECT: 'nba-production',
  FIREBASE_API_KEY: 'browser-key',
  FIREBASE_AUTH_DOMAIN: 'nba-production.firebaseapp.com',
};

describe('firebaseSettings', () => {
  it("takes production's from the env", () => {
    expect(firebaseSettings(production)).toEqual({
      projectId: 'nba-production',
      apiKey: 'browser-key',
      authDomain: 'nba-production.firebaseapp.com',
    });
  });

  it.each(['GOOGLE_CLOUD_PROJECT', 'FIREBASE_API_KEY', 'FIREBASE_AUTH_DOMAIN'])(
    'refuses to boot in production without %s',
    (name) => {
      expect(() => firebaseSettings({ ...production, [name]: '' })).toThrow(
        'are required in production',
      );
    },
  );

  it('falls back to the dev project elsewhere, with the key from the env', () => {
    expect(firebaseSettings({ FIREBASE_API_KEY: 'dev-key' })).toEqual({
      projectId: 'yuval-nba-test',
      apiKey: 'dev-key',
      authDomain: 'yuval-nba-test.firebaseapp.com',
    });
  });

  it('refuses to boot without the key, naming it', () => {
    expect(() => firebaseSettings({})).toThrow('FIREBASE_API_KEY is required');
  });
});
