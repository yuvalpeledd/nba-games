import { Stack, Typography } from '@mui/material';
import { LastScan } from './last-scan/LastScan';

// ponytail: a greeting and the data-fetcher's last run until the dashboard has more to show (today's games, predictions).
export function DashboardPage() {
  return (
    <Stack spacing={2}>
      <Typography variant="h1">Hello</Typography>
      <LastScan />
    </Stack>
  );
}
