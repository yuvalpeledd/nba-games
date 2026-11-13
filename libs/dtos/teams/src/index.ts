import type { VenueDto } from '@nba/dtos';

export interface TeamDto {
  id: string;
  abbreviation: string;
  name: string;
  nickname: string;
  city: string;
  conference: string;
  division: string;
  venue: VenueDto;
  // False for a franchise that moved or folded.
  active: boolean;
}
