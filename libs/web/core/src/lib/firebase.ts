import type { DataResponse } from '@nba/dtos';
import type { FirebaseConfigDto } from '@nba/dtos-auth';
import { getApps, initializeApp } from 'firebase/app';
import { type Auth, getAuth, signOut } from 'firebase/auth';

// This deployment's Identity Platform, from the API (the server's env, not the build), then Firebase's Auth with its
// session (IndexedDB) loaded. It renews the ID token before it expires.
async function load(): Promise<Auth> {
  const response = await fetch('/api/firebase-config');
  if (!response.ok) {
    throw new Error(`/api/firebase-config answered ${response.status}`);
  }
  const { apiKey, authDomain } = (
    (await response.json()) as DataResponse<FirebaseConfigDto>
  ).data;
  const auth = getAuth(getApps()[0] ?? initializeApp({ apiKey, authDomain }));
  await auth.authStateReady();
  return auth;
}

let loading: Promise<Auth> | null = null;

// Firebase's Auth, loaded once (again after a failure). Its config comes by plain fetch: api() needs this for its
// token.
export function firebaseAuth(): Promise<Auth> {
  loading ??= load().catch((error: unknown) => {
    loading = null;
    throw error;
  });
  return loading;
}

// The signed-in account's ID token (renewed when it's about to expire); null when Firebase has no one.
export async function idToken(): Promise<string | null> {
  return (await firebaseAuth()).currentUser?.getIdToken() ?? null;
}

// Firebase's session outlives the page's.
export async function signOutOfFirebase(): Promise<void> {
  await signOut(await firebaseAuth());
}

// A Firebase error's code (`auth/invalid-credential`, ...), for the page's own message; null for anything else.
export const firebaseCodeOf = (error: unknown): string | null => {
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === 'string' && code.startsWith('auth/') ? code : null;
};
