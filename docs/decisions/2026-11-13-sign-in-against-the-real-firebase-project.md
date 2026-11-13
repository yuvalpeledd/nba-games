# Sign-in against the real Firebase project, no emulator

2026-11-13

- **Local runs sign in against `yuval-nba-test-882ca`**, as outly's do against its dev project: local sign-ups are real accounts there, and Firebase sends real emails.
  It replaces the Auth emulator of [the auth decision](2026-11-13-auth-outly-s-firebase-sign-in-trimmed.md), which is gone (its script, `firebase.json`, `emulatorHost`), as asked.
- **Its web API key comes from `.env` (`FIREBASE_API_KEY`), not the code**, unlike outly's: the API refuses to boot without it, naming it.
  The key is public by design (the web gets it), so it could move into `firebaseSettings` as outly's does if `.env` gets in the way.
