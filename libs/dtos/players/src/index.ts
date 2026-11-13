import { idSchema } from '@nba/dtos';
import { InferType, number, object } from 'yup';

export interface PlayerDto {
  id: string;
  // Today's team; null for a player on no roster.
  teamId: string | null;
  name: string;
  firstName: string;
  lastName: string;
  position: string | null;
  jerseyNumber: string | null;
  heightIn: number | null;
  weightLb: number | null;
  birthDate: string | null;
  birthPlace: {
    city: string | null;
    state: string | null;
    country: string | null;
  } | null;
  rosterStatus: string;
  college: string | null;
  experienceYears: number | null;
}

// A team the player was on, from the first to the last day a roster fetch saw them there ('YYYY-MM-DD').
export interface PlayerTeamDto {
  teamId: string;
  from: string;
  to: string;
}

export const MAX_PLAYERS_PAGE = 100;

// GET /players: by name, a page at a time.
export const playersQuerySchema = object({
  teamId: idSchema,
  limit: number().integer().min(1).max(MAX_PLAYERS_PAGE).default(50),
  offset: number().integer().min(0).default(0),
});
export type PlayersQuery = InferType<typeof playersQuerySchema>;
