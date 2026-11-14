import { Alert, Chip, Typography } from '@mui/material';
import { formatTime, useLastScan } from '@nba/web-core';
import { PageLoader } from '@nba/web-shell-components';

// When the data-fetcher last ran, how it went and what it wrote.
export function LastScan() {
  const { data: scan, isError } = useLastScan();
  const failed = scan && !scan.success;
  return (
    <section
      className={`dashboard-page__panel dashboard-page__scan${failed ? ' dashboard-page__scan--failed' : ''}`}
      aria-labelledby="last-scan"
    >
      <div className="dashboard-page__scan-header">
        <Typography id="last-scan" variant="h2">
          Last scan
        </Typography>
        {scan && (
          <Chip
            label={scan.success ? 'Succeeded' : 'Failed'}
            color={scan.success ? 'success' : 'error'}
            size="small"
          />
        )}
      </div>
      {scan === undefined ? (
        <PageLoader error={isError} />
      ) : scan === null ? (
        <Typography>No scan yet</Typography>
      ) : (
        <>
          <div className="dashboard-page__scan-facts">
            <Typography>
              {formatTime(scan.finishedAt)}, in{' '}
              {Math.round(
                (Date.parse(scan.finishedAt) - Date.parse(scan.startedAt)) /
                  1000,
              )}
              s
            </Typography>
            <Typography>
              {scan.inserted} added, {scan.updated} updated, {scan.unchanged}{' '}
              unchanged
            </Typography>
          </div>
          {scan.error && (
            <Alert severity="error" sx={{ whiteSpace: 'pre-line' }}>
              {scan.error}
            </Alert>
          )}
        </>
      )}
    </section>
  );
}
