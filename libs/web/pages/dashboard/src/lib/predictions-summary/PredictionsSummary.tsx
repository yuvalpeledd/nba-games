import {
  Card,
  CardActionArea,
  CardContent,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import type { GameDto } from '@nba/dtos-games';
import {
  isPredictionLocked,
  type PredictionDto,
  scorePrediction,
} from '@nba/dtos-predictions';
import {
  currentSeason,
  formatWinPct,
  statHints,
  usePredictions,
  useSeasonGames,
  useSeasons,
} from '@nba/web-core';
import { predictionLabel } from '@nba/web-predictions-components';
import { PageLoader } from '@nba/web-shell-components';
import type { Filter } from '@nba/web-table-components';
import { Link as RouterLink } from 'react-router';

// The day (YYYY-MM-DD) `offset` days from the viewer's today's Monday.
const fromMonday = (offset: number, now = new Date()) => {
  const day = new Date(now);
  day.setDate(now.getDate() - ((now.getDay() + 6) % 7) + offset);
  return day.toLocaleDateString('en-CA');
};

// The games table's filters for this week's games without a pick: GamesPage opens with the `filters` of the
// navigation's state. The date filters' bounds are exclusive: the Sunday before and the Monday after.
// ponytail: names the games table's columns; put filters in the URL when a second page links into a table.
const unpickedThisWeek = (): Filter<'time' | 'prediction'>[] => [
  { column: 'time', operator: 'after', values: [fromMonday(-1)] },
  { column: 'time', operator: 'before', values: [fromMonday(7)] },
  { column: 'prediction', operator: 'is', values: [predictionLabel(null)] },
];

// The share of scored predictions that were right, and how many of how many; — before any is scored.
const successRate = (
  games: GameDto[],
  picks: Map<string, PredictionDto>,
): [string, string] => {
  const scores = games
    .map((game) => scorePrediction(picks.get(game.id), game))
    .filter((score) => score !== null);
  const right = scores.filter(Boolean).length;
  return scores.length
    ? [
        formatWinPct(right / scores.length),
        `${right} of ${scores.length} right`,
      ]
    : ['—', 'No results yet'];
};

function Counter({
  label,
  hint,
  value,
  detail,
  link,
}: {
  label: string;
  hint: string;
  value: string;
  detail: string;
  // Where a click goes, and the navigation's state.
  link?: { to: string; state: unknown };
}) {
  const content = (
    <CardContent>
      <Tooltip title={hint} describeChild>
        <Typography variant="overline">{label}</Typography>
      </Tooltip>
      <Typography variant="h2" component="p">
        {value}
      </Typography>
      <Typography variant="body2">{detail}</Typography>
    </CardContent>
  );
  return (
    <Card variant="outlined" role="group" aria-label={label} sx={{ flex: 1 }}>
      {link ? (
        <CardActionArea component={RouterLink} to={link.to} state={link.state}>
          {content}
        </CardActionArea>
      ) : (
        content
      )}
    </Card>
  );
}

// The signed-in user's predictions in the current season: the week's games still to pick, and how often they were right.
export function PredictionsSummary() {
  const seasons = useSeasons();
  const season = seasons.data && currentSeason(seasons.data);
  const games = useSeasonGames(season?.year);
  const predictions = usePredictions(season?.year);
  const loaded = games.data && predictions.data;
  return (
    <Stack component="section" spacing={1} aria-labelledby="predictions">
      <Typography id="predictions" variant="h2">
        Predictions
      </Typography>
      {!loaded ? (
        <PageLoader
          error={seasons.isError || games.isError || predictions.isError}
        />
      ) : (
        <Counters games={games.data} predictions={predictions.data} />
      )}
    </Stack>
  );
}

function Counters({
  games,
  predictions,
}: {
  games: GameDto[];
  predictions: PredictionDto[];
}) {
  const picks = new Map(predictions.map((p) => [p.gameId, p]));
  const [monday, sunday] = [fromMonday(0), fromMonday(6)];
  const week = games.filter(({ date }) => date >= monday && date <= sunday);
  const left = week.filter(
    (game) => !isPredictionLocked(game) && !picks.get(game.id)?.pick,
  ).length;
  const [weekRate, weekDetail] = successRate(week, picks);
  const [seasonRate, seasonDetail] = successRate(games, picks);
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
      <Counter
        label="Left this week"
        hint={statHints.predictionsLeft}
        value={String(left)}
        detail={`of ${week.length} games this week`}
        link={{ to: '/games', state: { filters: unpickedThisWeek() } }}
      />
      <Counter
        label="Success this week"
        hint={statHints.predictionsSuccess}
        value={weekRate}
        detail={weekDetail}
      />
      <Counter
        label="Success this season"
        hint={statHints.predictionsSuccess}
        value={seasonRate}
        detail={seasonDetail}
      />
    </Stack>
  );
}
