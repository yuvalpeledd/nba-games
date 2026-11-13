import type { DataResponse } from '@nba/dtos';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

const messageOf = (body: unknown): string => {
  const message = (body as { message?: string | string[] } | null)?.message;
  return Array.isArray(message)
    ? message.join(', ')
    : (message ?? 'Request failed');
};

// Calls frontend-api and unwraps `{ data }`; an error answer throws its status and message.
// ponytail: GET only; add a method and a JSON body with the first mutation (predictions).
export async function api<T>(path: string): Promise<T> {
  const response = await fetch(`/api${path}`);
  const json: unknown = await response.json().catch(() => null);
  if (response.ok) return (json as DataResponse<T>).data;
  throw new ApiError(response.status, messageOf(json));
}
