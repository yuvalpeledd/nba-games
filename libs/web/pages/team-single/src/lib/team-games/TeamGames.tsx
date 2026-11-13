import {
  Link,
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
import { useTableSort } from '@nba/web-table-components';
import { Link as RouterLink } from 'react-router';

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
  const { rows, headCell } = useTableSort(
    (games ?? []).map((game) => sideOf(game, teamId, teamNames)),
    {
      time: (row) => row.game.startTime,
      opponent: (row) => row.opponent,
      home: (row) => Number(row.isHome),
      result: (row) => row.margin,
    },
  );
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
    <TableContainer>
      <Table aria-label="Games">
        <TableHead>
          <TableRow>
            {headCell('time', 'Time')}
            {headCell('opponent', 'Opponent')}
            {headCell('home', 'Home')}
            {headCell('result', 'Result', 'right')}
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
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
