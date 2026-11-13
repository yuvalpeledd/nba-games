// An arena, as the provider gives it (a jsonb column on teams and games).
export interface Venue {
  name: string;
  city: string;
  state: string | null;
  country: string;
}
