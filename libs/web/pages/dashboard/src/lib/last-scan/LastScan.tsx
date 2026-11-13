import {
  Alert,
  Card,
  CardContent,
  Chip,
  Stack,
  Typography,
} from '@mui/material';
import { formatTime, useLastScan } from '@nba/web-core';
import { PageLoader } from '@nba/web-shell-components';

// When the data-fetcher last ran, how it went and what it wrote.
export function LastScan() {
  const { data: scan, isError } = useLastScan();
  return (
    <Card component="section" variant="outlined" aria-labelledby="last-scan">
      <CardContent>
        <Stack spacing={1}>
          <Typography id="last-scan" variant="h2">
            Last scan
          </Typography>
          {scan === undefined ? (
            <PageLoader error={isError} />
          ) : scan === null ? (
            <Typography>No scan yet</Typography>
          ) : (
            <>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Chip
                  label={scan.success ? 'Succeeded' : 'Failed'}
                  color={scan.success ? 'success' : 'error'}
                  size="small"
                />
                <Typography>
                  {formatTime(scan.finishedAt)}, in{' '}
                  {Math.round(
                    (Date.parse(scan.finishedAt) - Date.parse(scan.startedAt)) /
                      1000,
                  )}
                  s
                </Typography>
              </Stack>
              <Typography>
                {scan.inserted} added, {scan.updated} updated, {scan.unchanged}{' '}
                unchanged
              </Typography>
              {scan.error && (
                <Alert severity="error" sx={{ whiteSpace: 'pre-line' }}>
                  {scan.error}
                </Alert>
              )}
            </>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
