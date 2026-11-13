import {
  Link,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Typography,
} from '@mui/material';
import type { GameDto } from '@nba/dtos-games';
import type { TeamDto } from '@nba/dtos-teams';
import { GameStatus } from '@nba/sql-games/enums';
import type { PredictionPick } from '@nba/sql-predictions/enums';
import { formatTime } from '@nba/web-core';
import {
  type Filter,
  useTableFilters,
  useTableSort,
} from '@nba/web-table-components';
import { type ReactNode, useState } from 'react';
import { Link as RouterLink } from 'react-router';
import { PredictionCell, predictionLabel } from './PredictionCell';

const statusLabels: Record<GameStatus, string> = {
  [GameStatus.SCHEDULED]: 'Scheduled',
  [GameStatus.IN_PROGRESS]: 'Live',
  [GameStatus.FINAL]: 'Final',
  [GameStatus.POSTPONED]: 'Postponed',
  [GameStatus.CANCELED]: 'Canceled',
  [GameStatus.SUSPENDED]: 'Suspended',
  [GameStatus.DELAYED]: 'Delayed',
};

const ROWS_PER_PAGE = 50;

export type GamesTableFilter = Filter<'time' | 'status' | 'prediction'>;

// The viewer's day `days` ago, YYYY-MM-DD (the Canadian format is ISO's).
const daysAgo = (days: number): string => {
  const day = new Date();
  day.setDate(day.getDate() - days);
  return day.toLocaleDateString('en-CA');
};

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

// Games with the signed-in user's picks, by day, filtered and paged in the browser; at first, those after two days
// ago, or `filters`. `actions` adds a last cell per row (a row's menu).
export function GamesTable({
  games,
  teams,
  picks,
  filters,
  actions,
}: {
  games: GameDto[];
  teams: TeamDto[];
  picks: Map<string, PredictionPick | null>;
  filters?: GamesTableFilter[];
  actions?: (game: GameDto) => ReactNode;
}) {
  const [page, setPage] = useState(0);
  const nameOf = (id: string) =>
    teams.find((team) => team.id === id)?.name ?? id;
  const allRows = games.map((game) => ({
    game,
    away: nameOf(game.awayTeamId),
    home: nameOf(game.homeTeamId),
    played: game.awayScore !== null && game.homeScore !== null,
    pick: picks.get(game.id),
  }));
  const totalOf = (row: (typeof allRows)[number]) =>
    row.played
      ? (row.game.awayScore as number) + (row.game.homeScore as number)
      : null;
  const filtered = useTableFilters(
    allRows,
    {
      // The league's day (`date`), as schedules group them.
      time: { label: 'Date', type: 'date', value: (row) => row.game.date },
      away: { label: 'Away', type: 'select', value: (row) => row.away },
      home: { label: 'Home', type: 'select', value: (row) => row.home },
      score: { label: 'Total Points', type: 'number', value: totalOf },
      status: {
        label: 'Status',
        type: 'select',
        value: (row) => statusLabels[row.game.status],
      },
      prediction: {
        label: 'Prediction',
        type: 'select',
        value: (row) => predictionLabel(row.pick),
      },
    },
    filters ?? [{ column: 'time', operator: 'after', values: [daysAgo(2)] }],
  );
  const { rows, headCell } = useTableSort(filtered.rows, {
    time: (row) => row.game.startTime,
    away: (row) => row.away,
    home: (row) => row.home,
    score: totalOf,
    status: (row) => statusLabels[row.game.status],
    prediction: (row) => row.pick ?? null,
  });
  // Back to the last page there is when filters leave fewer rows.
  const shownPage = Math.min(
    page,
    Math.max(0, Math.ceil(rows.length / ROWS_PER_PAGE) - 1),
  );
  if (allRows.length === 0) {
    return (
      <Typography color="text.secondary">No games this season.</Typography>
    );
  }

  return (
    <Stack spacing={2}>
      {filtered.filterBar}
      <TableContainer>
        <Table aria-label="Games">
          <TableHead>
            <TableRow>
              {headCell('time', 'Time')}
              {headCell('away', 'Away')}
              {headCell('home', 'Home')}
              {headCell('score', 'Score', 'right')}
              {headCell('status', 'Status')}
              {headCell('prediction', 'Prediction')}
              {actions && <TableCell aria-label="Actions" />}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows
              .slice(shownPage * ROWS_PER_PAGE, (shownPage + 1) * ROWS_PER_PAGE)
              .map(({ game, away, home, played, pick }) => (
                <TableRow key={game.id}>
                  <TableCell>{formatTime(game.startTime)}</TableCell>
                  <TeamCell id={game.awayTeamId} name={away} />
                  <TeamCell id={game.homeTeamId} name={home} />
                  <TableCell align="right">
                    {played ? `${game.awayScore}-${game.homeScore}` : 'N/A'}
                  </TableCell>
                  <TableCell>{statusLabels[game.status]}</TableCell>
                  <PredictionCell game={game} pick={pick} />
                  {actions && (
                    <TableCell align="right" sx={{ py: 0 }}>
                      {actions(game)}
                    </TableCell>
                  )}
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={rows.length}
        page={shownPage}
        rowsPerPage={ROWS_PER_PAGE}
        rowsPerPageOptions={[]}
        onPageChange={(_, next) => setPage(next)}
      />
    </Stack>
  );
}
