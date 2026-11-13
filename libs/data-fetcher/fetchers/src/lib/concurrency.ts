// How many requests a fetcher has in flight at once (pMap's `concurrency`): FETCH_CONCURRENCY, default 5.
export const fetchConcurrency = (): number =>
  Number(process.env['FETCH_CONCURRENCY'] ?? 5);
