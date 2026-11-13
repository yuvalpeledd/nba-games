// One function per kind of number, so each reads the same everywhere.

// A season by the year it starts in: 2026 is `2026-27`.
export const formatSeason = (year: number): string =>
  `${year}-${String((year + 1) % 100).padStart(2, '0')}`;

// The league's way: .846, and 1.000 for a perfect record.
export const formatWinPct = (winPct: number): string =>
  winPct.toFixed(3).replace(/^0/, '');

// Games behind: — for the leader, else whole or a half (2, 1.5).
export const formatGamesBehind = (gamesBehind: number): string =>
  gamesBehind === 0 ? '—' : String(gamesBehind);
