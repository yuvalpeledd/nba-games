# The app is private: everything needs a signed-in user

2026-11-13

- **No page and no API route works signed out**, as asked: it replaces "NBA data stays open" in [the auth decision](2026-11-13-auth-outly-s-firebase-sign-in-trimmed.md).
- **The API guards everything, not only the web:** hiding the pages alone would leave the data a `curl` away.
  `AccessGuard` is global (`APP_GUARD`), so a new route is guarded without anyone remembering to; what must work before signing in says so with `@Public()`.
- **The web wraps its routes in outly's `RequireAuth`**, which sends anyone signed out to `/login` and has them make no API call first.
  After logging in they land on the dashboard, not the page they asked for; carry it through `/login`'s state if that annoys.
- **Anyone can still sign up** (with a verified email): private means signed in, not invited.
  Restrict sign-ups (an allow list, invitations as in outly) if strangers shouldn't get in.
