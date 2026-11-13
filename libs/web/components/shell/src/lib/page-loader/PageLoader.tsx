import { Alert, Box, CircularProgress } from '@mui/material';
import type { PageLoaderProps } from './types';
import './page-loader.scss';

// Placeholder while a page's data loads, or a generic error if it failed.
export function PageLoader({ error = false }: PageLoaderProps) {
  return (
    <Box className="page-loader">
      {error ? (
        <Alert severity="error">
          Something went wrong. Refresh the page to try again.
        </Alert>
      ) : (
        <CircularProgress aria-label="Loading" />
      )}
    </Box>
  );
}
