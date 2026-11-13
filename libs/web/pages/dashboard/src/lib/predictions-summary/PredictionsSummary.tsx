import { Card, CardContent, Stack, Tooltip, Typography } from '@mui/material';
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
import { PageLoader } from '@nba/web-shell-components';

const day = (date: Date) => date.toLocaleDateString('en-CA'); // YYYY-MM-DD

// Monday to Sunday around the viewer's today, as league days (GameDto.date).
const thisWeek = (now = new Date()): [string, string] => {
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return [day(monday), day(sunday)];
};

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
}: {
  label: string;
  hint: string;
  value: string;
  detail: string;
}) {
  return (
    <Card variant="outlined" role="group" aria-label={label} sx={{ flex: 1 }}>
      <CardContent>
        <Tooltip title={hint} describeChild>
          <Typography variant="overline">{label}</Typography>
        </Tooltip>
        <Typography variant="h2" component="p">
          {value}
        </Typography>
        <Typography variant="body2">{detail}</Typography>
      </CardContent>
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
  const [monday, sunday] = thisWeek();
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
