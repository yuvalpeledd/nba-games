// Days as 'YYYY-MM-DD' strings, the way the league and our `date` columns count them.

// The league's day (US Eastern) at `at`: a 10 PM ET game on the 11th is the 11th, though it's the 12th in UTC.
export const easternDate = (at = new Date()): string =>
  at.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });

// Every day from `from` to `to`, both included.
export function daysBetween(from: string, to: string): string[] {
  const days: string[] = [];
  for (
    const day = new Date(`${from}T00:00:00Z`);
    day.toISOString().slice(0, 10) <= to;
    day.setUTCDate(day.getUTCDate() + 1)
  ) {
    days.push(day.toISOString().slice(0, 10));
  }
  return days;
}

// Nearest to `today` first; of two as near, the earlier (yesterday before tomorrow).
export const byDistanceFrom =
  (today: string) =>
  (a: string, b: string): number => {
    const from = Date.parse(today);
    return (
      Math.abs(Date.parse(a) - from) - Math.abs(Date.parse(b) - from) ||
      a.localeCompare(b)
    );
  };
