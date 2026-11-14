// The { data } envelope every answer shares, and what more than one contract uses. Each contract has a lib of its own
// (@nba/dtos-<name>), shared by frontend-api and the web: keep every dtos lib free of server-only imports.
import { string } from 'yup';

// Every API response is JSON wrapped in `data`: `{ data: {...} }` or `{ data: [...] }`.
export interface DataResponse<T> {
  data: T;
}

// An arena, as the provider gives it.
export interface VenueDto {
  name: string;
  city: string;
  state: string | null;
  country: string;
}

// The provider's ids (`nba-por`, `nba-20261111-bos-tor`, `nba-p-121d86716a`), in a path or a query.
export const idSchema = string().trim().max(100);

// 'YYYY-MM-DD', a real day.
export const daySchema = string().test(
  'day',
  '${path} must be a date (YYYY-MM-DD)',
  (value) => {
    if (value == null) return true;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const day = new Date(`${value}T00:00:00Z`);
    return !isNaN(day.getTime()) && day.toISOString().startsWith(value);
  },
);
