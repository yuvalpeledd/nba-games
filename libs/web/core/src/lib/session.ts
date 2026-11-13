import type { SessionDto } from '@nba/dtos-auth';
import { useSyncExternalStore } from 'react';
import { signOutOfFirebase } from './firebase';

// The user that Firebase's account is (from /login or /sign-up). Firebase keeps the sign-in itself (its IndexedDB),
// and api() asks it for the token: kept here, so useSession() stays synchronous.
export type Session = SessionDto;

const STORAGE_KEY = 'nba.session';
const listeners = new Set<() => void>();

function read(): Session | null {
  try {
    const stored: unknown = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? 'null',
    );
    const userId = (stored as Partial<Session> | null)?.userId;
    return typeof userId === 'string' ? { userId } : null;
  } catch {
    return null; // storage blocked or corrupted: signed out
  }
}

let current = read();

function write(session: Session | null): void {
  current = session;
  try {
    if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // storage blocked: the session lives until the tab closes
  }
  listeners.forEach((listener) => listener());
}

export const startSession = ({ userId }: SessionDto): void => write({ userId });

// Signs out of Firebase too.
export const clearSession = (): void => {
  write(null);
  signOutOfFirebase().catch(() => undefined);
};

export const getSession = (): Session | null => current;

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useSession = (): Session | null =>
  useSyncExternalStore(subscribe, getSession);
