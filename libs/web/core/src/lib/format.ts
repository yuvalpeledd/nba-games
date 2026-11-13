// One function per kind of number, so each reads the same everywhere.

// A season by the year it starts in: 2026 is `2026-27`.
export const formatSeason = (year: number): string =>
  `${year}-${String((year + 1) % 100).padStart(2, '0')}`;

// As a percentage: 0.876 is 87.6%.
export const formatWinPct = (winPct: number): string =>
  `${(winPct * 100).toFixed(1)}%`;

// Games behind: — for the leader, else whole or a half (2, 1.5).
export const formatGamesBehind = (gamesBehind: number): string =>
  gamesBehind === 0 ? '—' : String(gamesBehind);

// A moment (ISO) on the viewer's clock: `Wed, Oct 21, 7:30 PM`.
export const formatTime = (iso: string): string =>
  new Date(iso).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

// Inches the league's way: 6-7.
export const formatHeight = (inches: number): string =>
  `${Math.floor(inches / 12)}-${inches % 12}`;
