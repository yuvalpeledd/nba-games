import TodayIcon from '@mui/icons-material/Today';
import {
  Button,
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
import { formatTime, statHints } from '@nba/web-core';
import {
  type Filter,
  type FilterColumn,
  useTableFilters,
  useTableSort,
} from '@nba/web-table-components';
import { type ReactNode, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
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

// The viewer's today, YYYY-MM-DD (the Canadian format is ISO's).
const today = (): string => new Date().toLocaleDateString('en-CA');

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

// Games with the signed-in user's picks, by day, filtered and paged in the browser, at first by `filters`; Today
// jumps to today's games. `gameScore` adds a column of what a right pick of each is worth (a group's); `actions` a last
// cell per row (a row's menu).
export function GamesTable({
  games,
  teams,
  picks,
  filters,
  gameScore,
  actions,
}: {
  games: GameDto[];
  teams: TeamDto[];
  picks: Map<string, PredictionPick | null>;
  filters?: GamesTableFilter[];
  gameScore?: (game: GameDto) => number;
  actions?: (game: GameDto) => ReactNode;
}) {
  const [page, setPage] = useState(0);
  const tableRef = useRef<HTMLTableElement>(null);
  const nameOf = (id: string) =>
    teams.find((team) => team.id === id)?.name ?? id;
  const allRows = games.map((game) => ({
    game,
    away: nameOf(game.awayTeamId),
    home: nameOf(game.homeTeamId),
    played: game.awayScore !== null && game.homeScore !== null,
    pick: picks.get(game.id),
    gameScore: gameScore?.(game) ?? null,
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
      // Only where the column shows (a group's games).
      ...((gameScore
        ? {
            gameScore: {
              label: 'Game Score',
              type: 'number',
              value: (row) => row.gameScore,
            },
          }
        : {}) as Record<'gameScore', FilterColumn<(typeof allRows)[number]>>),
    },
    filters,
  );
  const { rows, headCell } = useTableSort(filtered.rows, {
    time: (row) => row.game.startTime,
    away: (row) => row.away,
    home: (row) => row.home,
    score: totalOf,
    status: (row) => statusLabels[row.game.status],
    prediction: (row) => row.pick ?? null,
    gameScore: (row) => row.gameScore,
  });
  // Back to the last page there is when filters leave fewer rows.
  const shownPage = Math.min(
    page,
    Math.max(0, Math.ceil(rows.length / ROWS_PER_PAGE) - 1),
  );
  // To the first row of today, else of the last day before it with games (else the first row): its page, then the
  // row at the top of the screen. The league's day, as the filters compare it.
  const jumpToToday = () => {
    const day = today();
    const last = rows.reduce<string | null>(
      (found, { game }) =>
        game.date <= day && (found === null || game.date > found)
          ? game.date
          : found,
      null,
    );
    const index = Math.max(
      0,
      rows.findIndex(({ game }) => game.date === last),
    );
    // Rendered now, so the row is there to scroll to.
    flushSync(() => setPage(Math.floor(index / ROWS_PER_PAGE)));
    tableRef.current
      ?.querySelector(`[data-game-id="${rows[index].game.id}"]`)
      ?.scrollIntoView({ block: 'start' });
  };
  if (allRows.length === 0) {
    return (
      <Typography color="text.secondary">No games this season.</Typography>
    );
  }

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
        <Button
          variant="outlined"
          startIcon={<TodayIcon />}
          disabled={rows.length === 0}
          onClick={jumpToToday}
        >
          Today
        </Button>
        {filtered.filterBar}
      </Stack>
      <TableContainer>
        <Table aria-label="Games" ref={tableRef}>
          <TableHead>
            <TableRow>
              {headCell('time', 'Time')}
              {headCell('away', 'Away')}
              {headCell('home', 'Home')}
              {headCell('score', 'Score', 'right')}
              {headCell('status', 'Status')}
              {headCell('prediction', 'Prediction')}
              {gameScore &&
                headCell(
                  'gameScore',
                  'Game Score',
                  'right',
                  statHints.gameScore,
                )}
              {actions && <TableCell aria-label="Actions" />}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows
              .slice(shownPage * ROWS_PER_PAGE, (shownPage + 1) * ROWS_PER_PAGE)
              .map(({ game, away, home, played, pick, gameScore: worth }) => (
                <TableRow key={game.id} data-game-id={game.id}>
                  <TableCell>{formatTime(game.startTime)}</TableCell>
                  <TeamCell id={game.awayTeamId} name={away} />
                  <TeamCell id={game.homeTeamId} name={home} />
                  <TableCell align="right">
                    {played ? `${game.awayScore}-${game.homeScore}` : 'N/A'}
                  </TableCell>
                  <TableCell>{statusLabels[game.status]}</TableCell>
                  <PredictionCell game={game} pick={pick} />
                  {gameScore && <TableCell align="right">{worth}</TableCell>}
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
