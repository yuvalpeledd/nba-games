import { ApiError } from '@nba/web-core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ComponentType, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { PageLayout } from '../page-layout/PageLayout';
import { ThemeRoot } from '../theme';

// The app's pages, by name. Each is a lib of its own, which this lib can't import (they import it): the app passes
// them all in, and a spec its own, with stand-ins for the rest.
export const PAGE_NAMES = [
  'DashboardPage',
  'StandingsPage',
  'TeamsPage',
] as const;

export type Pages = Record<(typeof PAGE_NAMES)[number], ComponentType>;

// A 4xx won't change on retry.
const retry = (failureCount: number, error: Error): boolean =>
  !(error instanceof ApiError && error.status < 500) && failureCount < 2;

// The app: its providers, and its routes with their pages.
export function AppShell({ pages }: { pages: Pages }) {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry } } }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeRoot>
        <BrowserRouter>
          <Routes>
            <Route element={<PageLayout />}>
              <Route index element={<pages.DashboardPage />} />
              <Route path="standings" element={<pages.StandingsPage />} />
              <Route path="teams" element={<pages.TeamsPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ThemeRoot>
    </QueryClientProvider>
  );
}
