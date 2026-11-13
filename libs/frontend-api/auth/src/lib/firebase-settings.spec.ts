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
      emulatorHost: null,
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

  it('refuses the emulator in production: firebase-admin would trust any token', () => {
    expect(() =>
      firebaseSettings({
        ...production,
        FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099',
      }),
    ).toThrow('FIREBASE_AUTH_EMULATOR_HOST must be unset in production');
  });

  it('runs on the emulator elsewhere, without a real project', () => {
    expect(firebaseSettings({})).toEqual({
      projectId: 'demo-nba',
      apiKey: 'demo-key',
      authDomain: 'demo-nba.firebaseapp.com',
      emulatorHost: '127.0.0.1:9099',
    });
    expect(
      firebaseSettings({ FIREBASE_AUTH_EMULATOR_HOST: 'localhost:9199' }),
    ).toMatchObject({ emulatorHost: 'localhost:9199' });
  });

  it('takes a real project elsewhere once FIREBASE_API_KEY names one, and asks for the rest', () => {
    const { NODE_ENV: _, ...local } = production;
    expect(firebaseSettings(local)).toMatchObject({
      projectId: 'nba-production',
      emulatorHost: null,
    });
    expect(() =>
      firebaseSettings({ ...local, FIREBASE_AUTH_DOMAIN: '' }),
    ).toThrow('FIREBASE_API_KEY needs');
  });
});
