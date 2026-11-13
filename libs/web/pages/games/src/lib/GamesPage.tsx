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
import { GameStatus } from '@nba/sql-games/enums';
import {
  currentSeason,
  formatSeason,
  formatTime,
  useSeasonGames,
  useSeasons,
  useTeams,
} from '@nba/web-core';
import { PageLoader } from '@nba/web-shell-components';
import { useTableFilters, useTableSort } from '@nba/web-table-components';
import { useState } from 'react';
import { Link as RouterLink } from 'react-router';

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

// Every team's games in the current season, by day, filtered and paged in the browser.
export function GamesPage() {
  const seasons = useSeasons();
  const season = seasons.data && currentSeason(seasons.data);
  const teams = useTeams();
  const games = useSeasonGames(season?.year);
  const [page, setPage] = useState(0);
  const nameOf = (id: string) =>
    teams.data?.find((team) => team.id === id)?.name ?? id;
  const seasonRows = (games.data ?? []).map((game) => ({
    game,
    away: nameOf(game.awayTeamId),
    home: nameOf(game.homeTeamId),
    played: game.awayScore !== null && game.homeScore !== null,
  }));
  const totalOf = (row: (typeof seasonRows)[number]) =>
    row.played
      ? (row.game.awayScore as number) + (row.game.homeScore as number)
      : null;
  const filtered = useTableFilters(seasonRows, {
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
  });
  const { rows, headCell } = useTableSort(filtered.rows, {
    time: (row) => row.game.startTime,
    away: (row) => row.away,
    home: (row) => row.home,
    score: totalOf,
    status: (row) => statusLabels[row.game.status],
  });
  // Back to the last page there is when filters leave fewer rows.
  const shownPage = Math.min(
    page,
    Math.max(0, Math.ceil(rows.length / ROWS_PER_PAGE) - 1),
  );
  // No season at all: nothing to wait for.
  if (!seasons.data || (season && !games.data) || !teams.data) {
    const isError = seasons.isError || games.isError || teams.isError;
    return <PageLoader error={isError} />;
  }

  return (
    <Stack spacing={3}>
      <div>
        <Typography variant="h1">Games</Typography>
        {season && (
          <Typography color="text.secondary">
            {formatSeason(season.year)}
          </Typography>
        )}
      </div>
      {seasonRows.length === 0 ? (
        <Typography color="text.secondary">No games this season.</Typography>
      ) : (
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
                </TableRow>
              </TableHead>
              <TableBody>
                {rows
                  .slice(
                    shownPage * ROWS_PER_PAGE,
                    (shownPage + 1) * ROWS_PER_PAGE,
                  )
                  .map(({ game, away, home, played }) => (
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
          <TablePagination
            component="div"
            count={rows.length}
            page={shownPage}
            rowsPerPage={ROWS_PER_PAGE}
            rowsPerPageOptions={[]}
            onPageChange={(_, next) => setPage(next)}
          />
        </Stack>
      )}
    </Stack>
  );
}
