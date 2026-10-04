'use client';

import { useEffect, useSyncExternalStore } from 'react';
import type { SessionDto } from '@eckamcreation/api-contracts';
import { getAuthSession, loginCustomer, logoutCustomer, registerCustomer } from './api';
import { messageForAuthError } from './errors';
import type { AuthSnapshot, LoginInput, RegisterInput } from './types';

const loadingSnapshot: AuthSnapshot = {
  status: 'loading',
  session: null,
  notice: null,
};

let snapshot: AuthSnapshot = loadingSnapshot;
const listeners = new Set<() => void>();
let hydrateStarted = false;

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return snapshot;
}

function getServerSnapshot() {
  return loadingSnapshot;
}

function setSnapshot(next: AuthSnapshot) {
  snapshot = next;
  emit();
}

export function applySession(session: SessionDto) {
  setSnapshot({
    status: 'authenticated',
    session,
    notice: null,
  });
}

export function clearSession() {
  setSnapshot({
    status: 'anonymous',
    session: null,
    notice: null,
  });
}

export async function hydrateSession(force = false) {
  if (hydrateStarted && !force) {
    return snapshot;
  }

  hydrateStarted = true;
  if (snapshot.status !== 'authenticated') {
    setSnapshot(loadingSnapshot);
  }

  try {
    const data = await getAuthSession();
    if (data.authenticated && data.session) {
      applySession(data.session);
    } else {
      clearSession();
    }
  } catch (error) {
    setSnapshot({
      status: 'error',
      session: null,
      notice: messageForAuthError(error),
    });
  }

  return snapshot;
}

export async function signIn(input: LoginInput) {
  const session = await loginCustomer(input);
  applySession(session);
  return session;
}

export async function signUp(input: RegisterInput) {
  const session = await registerCustomer(input);
  applySession(session);
  return session;
}

export async function signOut() {
  await logoutCustomer();
  hydrateStarted = true;
  clearSession();
}

export function retryAuthSession() {
  hydrateStarted = false;
  return hydrateSession(true);
}

export function useAuth() {
  useEffect(() => {
    void hydrateSession();
  }, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
