import MoreVertIcon from '@mui/icons-material/MoreVert';
import {
  IconButton,
  Link,
  Menu,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import type { GameDto } from '@nba/dtos-games';
import { GameStatus } from '@nba/sql-games/enums';
import { formatTime, useTeamGames } from '@nba/web-core';
import { PageLoader } from '@nba/web-shell-components';
import { useTableFilters, useTableSort } from '@nba/web-table-components';
import { useState } from 'react';
import { Link as RouterLink } from 'react-router';
import { OpponentStatsDialog } from '../opponent-stats-dialog/OpponentStatsDialog';

// A row's opponent, for its menu and the dialog the menu opens.
interface OpponentOf {
  gameId: string;
  startTime: string;
  opponentId: string;
  opponent: string;
}

// A game from the team's side: where, against whom, and the score with the team's first: W/L and the score once
// final, the score while on, else N/A.
const sideOf = (
  game: GameDto,
  teamId: string,
  teamNames: Map<string, string>,
) => {
  const isHome = game.homeTeamId === teamId;
  const opponentId = isHome ? game.awayTeamId : game.homeTeamId;
  const [score, opponentScore] = isHome
    ? [game.homeScore, game.awayScore]
    : [game.awayScore, game.homeScore];
  const won =
    game.status === GameStatus.FINAL ? game.winnerTeamId === teamId : null;
  const played = score !== null && opponentScore !== null;
  return {
    game,
    isHome,
    opponentId,
    opponent: teamNames.get(opponentId) ?? opponentId,
    margin: played ? score - opponentScore : null,
    won,
    result: played
      ? `${won === null ? '' : won ? 'W ' : 'L '}${score}-${opponentScore}`
      : 'N/A',
  };
};

// The team's games in the season, by tip-off.
export function TeamGames({
  teamId,
  season,
  teamNames,
}: {
  teamId: string;
  season: number | undefined;
  teamNames: Map<string, string>;
}) {
  const { data: games, isError } = useTeamGames(teamId, season);
  const filtered = useTableFilters(
    (games ?? []).map((game) => sideOf(game, teamId, teamNames)),
    {
      time: { label: 'Time', type: 'date', value: (row) => row.game.startTime },
      opponent: {
        label: 'Opponent',
        type: 'select',
        value: (row) => row.opponent,
      },
      home: {
        label: 'Home',
        type: 'select',
        value: (row) => (row.isHome ? 'Yes' : 'No'),
      },
      result: {
        label: 'Result',
        type: 'select',
        value: (row) => (row.won === null ? 'N/A' : row.won ? 'W' : 'L'),
      },
    },
  );
  const { rows, headCell } = useTableSort(filtered.rows, {
    time: (row) => row.game.startTime,
    opponent: (row) => row.opponent,
    home: (row) => Number(row.isHome),
    result: (row) => row.margin,
  });
  const [menu, setMenu] = useState<
    (OpponentOf & { anchor: HTMLElement }) | null
  >(null);
  const [stats, setStats] = useState<OpponentOf | null>(null);
  if (season === undefined) {
    return <Typography color="text.secondary">No season yet.</Typography>;
  }
  if (!games) return <PageLoader error={isError} />;
  if (games.length === 0) {
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
              {headCell('opponent', 'Opponent')}
              {headCell('home', 'Home')}
              {headCell('result', 'Result', 'right')}
              <TableCell aria-label="Actions" />
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map(({ game, isHome, opponentId, opponent, won, result }) => (
              <TableRow key={game.id}>
                <TableCell>{formatTime(game.startTime)}</TableCell>
                <TableCell>
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{ alignItems: 'center' }}
                  >
                    {/* Decorative: the name beside it says which team. */}
                    <img
                      src={`/logos/${opponentId}.svg`}
                      alt=""
                      width={24}
                      height={24}
                    />
                    <Link component={RouterLink} to={`/teams/${opponentId}`}>
                      {opponent}
                    </Link>
                  </Stack>
                </TableCell>
                <TableCell>{isHome ? 'Yes' : 'No'}</TableCell>
                <TableCell align="right">
                  {/* On its own element: the design system colors every cell. */}
                  <Typography
                    component="span"
                    variant="inherit"
                    color={won === null ? undefined : won ? 'success' : 'error'}
                  >
                    {result}
                  </Typography>
                </TableCell>
                <TableCell align="right" sx={{ py: 0 }}>
                  <IconButton
                    className="row-menu"
                    aria-label="Actions"
                    aria-haspopup="menu"
                    aria-expanded={menu?.gameId === game.id}
                    onClick={(event) =>
                      setMenu({
                        gameId: game.id,
                        startTime: game.startTime,
                        opponentId,
                        opponent,
                        anchor: event.currentTarget,
                      })
                    }
                  >
                    <MoreVertIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Menu
          anchorEl={menu?.anchor}
          open={Boolean(menu)}
          onClose={() => setMenu(null)}
        >
          <MenuItem
            onClick={() => {
              setStats(menu);
              setMenu(null);
            }}
          >
            Statistics
          </MenuItem>
        </Menu>
        {stats && (
          <OpponentStatsDialog
            teamId={teamId}
            opponentId={stats.opponentId}
            opponent={stats.opponent}
            before={stats.startTime}
            onClose={() => setStats(null)}
          />
        )}
      </TableContainer>
    </Stack>
  );
}
