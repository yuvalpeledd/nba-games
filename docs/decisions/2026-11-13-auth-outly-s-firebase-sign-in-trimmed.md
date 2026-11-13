# Auth: outly's Firebase sign-in, trimmed

2026-11-13

- **outly's Firebase auth, trimmed:** Firebase ID tokens, a `users` row per account, email verified first; without organizations, roles, invitations, the audit log or the auth cache (a users lookup per guarded call).
  Add each with the first feature that needs it (a leaderboard's groups would bring roles back).
  It ends "no auth" in [the starting conventions](2026-11-13-the-starting-conventions.md) and [frontend-api's reads](2026-11-13-frontend-api-s-reads.md).
- **NBA data stays open; only the caller's own data is guarded.** Logging in is optional in the web, and no page needs it yet.
  Revisit if the app should be private (then outly's `RequireAuth` around the routes, and `AccessGuard` on every controller).
- **No Firebase project yet: locally, the Auth emulator** (`demo-nba`, no account, nothing kept) unless `FIREBASE_API_KEY` names a real project; production refuses to boot without one.
  Revisit when it's deployed (a project per environment, as outly's Terraform makes).
- **The login page is full-screen, a route outside the navbar's layout** in `AppShell`, so the layout stays in the shell lib ([the web-app](2026-11-13-the-web-app.md)).
- **`ErrorCode` started `@nba/enums`**, as CLAUDE.md planned; Jest compiles `jose` (firebase-admin's, ES modules only) as outly's preset does.
