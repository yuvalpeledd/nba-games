import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import {
  IconButton,
  Link,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { GameStatus } from '@nba/sql-games/enums';
import { formatTime, useGames, useTeams } from '@nba/web-core';
import { PageLoader } from '@nba/web-shell-components';
import { useTableSort } from '@nba/web-table-components';
import { Link as RouterLink, useSearchParams } from 'react-router';

const statusLabels: Record<GameStatus, string> = {
  [GameStatus.SCHEDULED]: 'Scheduled',
  [GameStatus.IN_PROGRESS]: 'Live',
  [GameStatus.FINAL]: 'Final',
  [GameStatus.POSTPONED]: 'Postponed',
  [GameStatus.CANCELED]: 'Canceled',
  [GameStatus.SUSPENDED]: 'Suspended',
  [GameStatus.DELAYED]: 'Delayed',
};

// 'YYYY-MM-DD' moved by `days` (parsed as UTC midnight, so no time zone shifts it).
const addDays = (date: string, days: number): string =>
  new Date(Date.parse(date) + days * 86_400_000).toISOString().slice(0, 10);

function TeamCell({ id, name }: { id: string; name: string }) {
  return (
    <TableCell>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        {/* Decorative: the name beside it says which team. */}
        <img src={`/logos/${id}.svg`} alt="" width={24} height={24} />
        <Link component={RouterLink} to={`/teams/${id}`}>
          {name}
        </Link>
      </Stack>
    </TableCell>
  );
}

// Every team's games on a league day (?date=, else the viewer's today), a day at a time.
// ponytail: a day per page; a whole season (~1,300 games) needs paging the API doesn't have for all teams.
export function GamesPage() {
  const [params, setParams] = useSearchParams();
  const date = params.get('date') ?? new Date().toLocaleDateString('en-CA');
  const teams = useTeams();
  const games = useGames(date);
  const nameOf = (id: string) =>
    teams.data?.find((team) => team.id === id)?.name ?? id;
  const { rows, headCell } = useTableSort(
    (games.data ?? []).map((game) => ({
      game,
      away: nameOf(game.awayTeamId),
      home: nameOf(game.homeTeamId),
      played: game.awayScore !== null && game.homeScore !== null,
    })),
    {
      time: (row) => row.game.startTime,
      away: (row) => row.away,
      home: (row) => row.home,
      score: (row) =>
        row.played
          ? (row.game.awayScore as number) + (row.game.homeScore as number)
          : null,
      status: (row) => statusLabels[row.game.status],
    },
  );
  const goTo = (next: string) => setParams({ date: next });

  return (
    <Stack spacing={3}>
      <Typography variant="h1">Games</Typography>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <IconButton
          aria-label="Previous day"
          onClick={() => goTo(addDays(date, -1))}
        >
          <ChevronLeftIcon />
        </IconButton>
        <TextField
          type="date"
          label="Day"
          size="small"
          value={date}
          onChange={(event) => event.target.value && goTo(event.target.value)}
        />
        <IconButton
          aria-label="Next day"
          onClick={() => goTo(addDays(date, 1))}
        >
          <ChevronRightIcon />
        </IconButton>
      </Stack>
      {!games.data || !teams.data ? (
        <PageLoader error={games.isError || teams.isError} />
      ) : rows.length === 0 ? (
        <Typography color="text.secondary">No games this day.</Typography>
      ) : (
        <TableContainer>
          <Table aria-label="Games">
            <TableHead>
              <TableRow>
                {headCell('time', 'Time')}
                {headCell('away', 'Away')}
                {headCell('home', 'Home')}
                {headCell('score', 'Score', 'right')}
                {headCell('status', 'Status')}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map(({ game, away, home, played }) => (
                <TableRow key={game.id}>
                  <TableCell>{formatTime(game.startTime)}</TableCell>
                  <TeamCell id={game.awayTeamId} name={away} />
                  <TeamCell id={game.homeTeamId} name={home} />
                  <TableCell align="right">
                    {played ? `${game.awayScore}-${game.homeScore}` : 'N/A'}
                  </TableCell>
                  <TableCell>{statusLabels[game.status]}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Stack>
  );
}
