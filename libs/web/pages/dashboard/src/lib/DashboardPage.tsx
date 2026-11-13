import { Stack, Typography } from '@mui/material';
import { LastScan } from './last-scan/LastScan';
import { PredictionsSummary } from './predictions-summary/PredictionsSummary';

// ponytail: a greeting, the user's predictions and the data-fetcher's last run until the dashboard has more to show (today's games).
export function DashboardPage() {
  return (
    <Stack spacing={2}>
      <Typography variant="h1">Hello</Typography>
      <PredictionsSummary />
      <LastScan />
    </Stack>
  );
}
