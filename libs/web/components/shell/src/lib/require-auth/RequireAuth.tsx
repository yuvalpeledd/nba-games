import { useSession } from '@nba/web-core';
import { Navigate, Outlet } from 'react-router';

// Wraps every route but /login: anyone signed out goes there.
export function RequireAuth() {
  return useSession() ? <Outlet /> : <Navigate to="/login" replace />;
}
