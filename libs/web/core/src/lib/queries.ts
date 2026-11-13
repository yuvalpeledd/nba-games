import type {
  LoginRequest,
  SessionDto,
  SignUpRequest,
  UserDto,
} from '@nba/dtos-auth';
import type { GameDto } from '@nba/dtos-games';
import type { PlayerDto } from '@nba/dtos-players';
import type { PredictionDto } from '@nba/dtos-predictions';
import type { ScanDto } from '@nba/dtos-scans';
import type { SeasonDto } from '@nba/dtos-seasons';
import type { StandingDto } from '@nba/dtos-standings';
import type { TeamDto } from '@nba/dtos-teams';
import { GameStatus } from '@nba/sql-games/enums';
import type { PredictionPick } from '@nba/sql-predictions/enums';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import { startSession, useSession } from './session';

// Newest first.
export const useSeasons = () =>
  useQuery({
    queryKey: ['seasons'],
    queryFn: () => api<SeasonDto[]>('GET', '/seasons'),
  });

// The data-fetcher's latest run; null before the first.
export const useLastScan = () =>
  useQuery({
    queryKey: ['scans', 'last'],
    queryFn: () => api<ScanDto | null>('GET', '/scans/last'),
  });

// Every team, past franchises included (`active` false), by name.
export const useTeams = () =>
  useQuery({
    queryKey: ['teams'],
    queryFn: () => api<TeamDto[]>('GET', '/teams'),
  });

// A season's, by its year (SeasonDto.year); waits for one.
export const useStandings = (season: number | undefined) =>
  useQuery({
    queryKey: ['standings', season],
    queryFn: () => api<StandingDto[]>('GET', `/standings?season=${season}`),
    enabled: season !== undefined,
  });

// Every team's games in a season (by its year), every type, by day; waits for a season, and is refetched each minute
// while one is live.
export const useSeasonGames = (season: number | undefined) =>
  useQuery({
    queryKey: ['games', { season }],
    queryFn: () => api<GameDto[]>('GET', `/games?season=${season}`),
    enabled: season !== undefined,
    refetchInterval: ({ state }) =>
      state.data?.some(({ status }) => status === GameStatus.IN_PROGRESS)
        ? 60_000
        : false,
  });

// A team's games in a season (by its year), preseason and playoffs too, by day; waits for a season.
export const useTeamGames = (teamId: string, season: number | undefined) =>
  useQuery({
    queryKey: ['games', { teamId, season }],
    queryFn: () =>
      api<GameDto[]>('GET', `/games?season=${season}&teamId=${teamId}`),
    enabled: season !== undefined,
  });

// Every game between two teams, either at home, every season and type, by day.
export const useHeadToHead = (teamId: string, opponentId: string) =>
  useQuery({
    queryKey: ['games', { teamId, opponentId }],
    queryFn: () =>
      api<GameDto[]>('GET', `/games?teamId=${teamId}&opponentId=${opponentId}`),
  });

// A team's current roster, by name.
// ponytail: the API's default page (50) covers a roster (~20); page it if that ever changes.
export const useTeamPlayers = (teamId: string) =>
  useQuery({
    queryKey: ['players', { teamId }],
    queryFn: () => api<PlayerDto[]>('GET', `/players?teamId=${teamId}`),
  });

// The signed-in user; waits for a session.
export const useMe = () => {
  const session = useSession();
  return useQuery({
    queryKey: ['me', session?.userId],
    queryFn: () => api<UserDto>('GET', '/me'),
    enabled: session !== null,
  });
};

// Both take the Firebase account's ID token (the login page signs in with Firebase first).
export const useLogin = () =>
  useMutation({
    mutationFn: (body: LoginRequest) => api<SessionDto>('POST', '/login', body),
    onSuccess: startSession,
  });

export const useSignUp = () =>
  useMutation({
    mutationFn: (body: SignUpRequest) =>
      api<SessionDto>('POST', '/sign-up', body),
    onSuccess: startSession,
  });

// The signed-in user's predictions of a season's games (by its year); waits for a session and a season.
export const usePredictions = (season: number | undefined) => {
  const session = useSession();
  return useQuery({
    queryKey: ['predictions', session?.userId, season],
    queryFn: () => api<PredictionDto[]>('GET', `/predictions?season=${season}`),
    enabled: session !== null && season !== undefined,
  });
};

// Picks a game's winner (null takes the pick back), then puts it in its season's predictions.
export const useSetPrediction = () => {
  const session = useSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      game,
      pick,
    }: {
      game: GameDto;
      pick: PredictionPick | null;
    }) => api<PredictionDto>('PUT', `/predictions/${game.id}`, { pick }),
    onSuccess: (prediction, { game }) =>
      queryClient.setQueryData<PredictionDto[]>(
        ['predictions', session?.userId, game.season],
        (predictions = []) => [
          ...predictions.filter(({ gameId }) => gameId !== prediction.gameId),
          prediction,
        ],
      ),
  });
};
