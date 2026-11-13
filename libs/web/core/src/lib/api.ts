import type { DataResponse } from '@nba/dtos';
import type { ErrorCode } from '@nba/enums';
import { idToken } from './firebase';
import { clearSession, getSession } from './session';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    // Tells apart errors the UI handles differently (see ErrorCode).
    readonly code: ErrorCode | null = null,
  ) {
    super(message);
  }
}

const codeOf = (body: unknown): ErrorCode | null =>
  (body as { code?: ErrorCode } | null)?.code ?? null;

const messageOf = (body: unknown): string => {
  const message = (body as { message?: string | string[] } | null)?.message;
  return Array.isArray(message)
    ? message.join(', ')
    : (message ?? 'Request failed');
};

// Calls frontend-api and unwraps `{ data }`, signed in with Firebase's ID token while there's a session. A 401 on a
// signed-in call ends the session, and so does a session that Firebase has no account for any more (signed out in
// another tab, its storage cleared).
export async function api<T>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown,
): Promise<T> {
  const session = getSession();
  const token = session && (await idToken());
  if (session && !token) {
    clearSession();
    throw new ApiError(401, 'Signed out');
  }
  const response = await fetch(`/api${path}`, {
    method,
    headers: {
      ...(body !== undefined && { 'content-type': 'application/json' }),
      ...(token && { authorization: `Bearer ${token}` }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json: unknown = await response.json().catch(() => null);
  if (response.ok) return (json as DataResponse<T>).data;
  if (response.status === 401 && session) clearSession();
  throw new ApiError(response.status, messageOf(json), codeOf(json));
}
