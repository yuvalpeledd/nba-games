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

// A league day ('YYYY-MM-DD') as `Wed, Oct 21`: a day has no time zone.
export const formatDay = (day: string): string =>
  new Date(`${day}T12:00:00Z`).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });

// A moment (ISO) on the viewer's clock: `7:30 PM`.
export const formatTime = (iso: string): string =>
  new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

// Inches the league's way: 6-7.
export const formatHeight = (inches: number): string =>
  `${Math.floor(inches / 12)}-${inches % 12}`;
