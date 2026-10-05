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
/** Bumped on sign-in/up/out so stale hydrate responses cannot clear a fresh session. */
let authEpoch = 0;
/** False until the first client effect; keeps hydration aligned with getServerSnapshot. */
let authUiReady = false;
const uiReadyListeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

function emitUiReady() {
  for (const listener of uiReadyListeners) {
    listener();
  }
}

function markAuthUiReady() {
  if (authUiReady) {
    return;
  }
  authUiReady = true;
  emitUiReady();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function subscribeUiReady(listener: () => void) {
  uiReadyListeners.add(listener);
  return () => {
    uiReadyListeners.delete(listener);
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

function bumpAuthEpoch() {
  authEpoch += 1;
  return authEpoch;
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
  const epoch = bumpAuthEpoch();
  if (snapshot.status !== 'authenticated') {
    setSnapshot(loadingSnapshot);
  }

  const timer = setTimeout(() => {
    if (epoch === authEpoch && snapshot.status === 'loading') {
      // Allow a later mount/retry; do not leave hydrate permanently stuck.
      // Keep this above typical warm-API latency but recover if a late response
      // still arrives with the same epoch (see apply path below).
      hydrateStarted = false;
      clearSession();
    }
  }, 12_000);

  try {
    const data = await getAuthSession();
    if (epoch !== authEpoch) {
      return snapshot;
    }
    if (data.authenticated && data.session) {
      applySession(data.session);
    } else {
      clearSession();
    }
  } catch (error) {
    if (epoch !== authEpoch) {
      return snapshot;
    }
    setSnapshot({
      status: 'error',
      session: null,
      notice: messageForAuthError(error),
    });
  } finally {
    clearTimeout(timer);
  }

  return snapshot;
}

export async function signIn(input: LoginInput) {
  const session = await loginCustomer(input);
  // Invalidate any in-flight hydrate that would otherwise clear this session.
  bumpAuthEpoch();
  hydrateStarted = true;
  applySession(session);
  return session;
}

export async function signUp(input: RegisterInput) {
  const session = await registerCustomer(input);
  bumpAuthEpoch();
  hydrateStarted = true;
  applySession(session);
  return session;
}

export async function signOut() {
  bumpAuthEpoch();
  await logoutCustomer();
  hydrateStarted = true;
  clearSession();
}

export function retryAuthSession() {
  hydrateStarted = false;
  return hydrateSession(true);
}

export function useAuth() {
  const ready = useSyncExternalStore(
    subscribeUiReady,
    () => authUiReady,
    () => false,
  );
  const store = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    markAuthUiReady();
    void hydrateSession();
  }, []);

  return ready ? store : loadingSnapshot;
}

/** Test-only: reset module auth state between cases. */
export function __resetAuthSessionForTests() {
  snapshot = loadingSnapshot;
  listeners.clear();
  uiReadyListeners.clear();
  hydrateStarted = false;
  authEpoch = 0;
  authUiReady = false;
}
