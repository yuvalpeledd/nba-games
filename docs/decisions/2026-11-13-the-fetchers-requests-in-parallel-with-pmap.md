# The fetchers' requests in parallel, with pMap

2026-11-13

- **pMap instead of a loop of awaits**, as asked: the rosters (30) and the games' days, `FETCH_CONCURRENCY` at a time (default 5).
  A cap, not everything at once: the provider's limits are per hour, but a burst of 50 is what it's likeliest to refuse, and the database writes come at the same pace.
- **`p-map` 4**, not 7: from 5 it's ES modules only, which Jest's CommonJS can't load without a transform (outly's `jest.preset.js` has one for others).
  Same API; move up if Jest or the libs go ESM.
- **What stays as it was:** the days start nearest to today first (pMap starts items in order), a roster's failure still writes nothing (pMap rejects on the first), and a 429 still stops the pool: the days in flight finish, no new one starts.
  What changes: per-item log lines come in the order items finish.
