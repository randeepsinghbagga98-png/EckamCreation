import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./api', () => ({
  getAuthSession: vi.fn(),
  loginCustomer: vi.fn(),
  logoutCustomer: vi.fn(),
  registerCustomer: vi.fn(),
}));

import { getAuthSession, loginCustomer } from './api';
import {
  __resetAuthSessionForTests,
  hydrateSession,
  signIn,
  useAuth,
} from './session';

describe('customer auth session store', () => {
  beforeEach(() => {
    __resetAuthSessionForTests();
    vi.mocked(getAuthSession).mockReset();
    vi.mocked(loginCustomer).mockReset();
  });

  afterEach(() => {
    __resetAuthSessionForTests();
  });

  it('does not let a stale hydrate clear a successful sign-in', async () => {
    let resolveHydrate: ((value: {
      authenticated: boolean;
      session: null;
    }) => void) | null = null;

    vi.mocked(getAuthSession).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveHydrate = resolve;
        }),
    );

    vi.mocked(loginCustomer).mockResolvedValue({
      kind: 'customer',
      userId: 'user_1',
      email: 'customer@example.com',
      name: 'Customer',
    });

    const hydratePromise = hydrateSession();

    await signIn({ email: 'customer@example.com', password: 'Secret123' });

    // Stale anonymous session response arrives after login succeeded.
    resolveHydrate?.({ authenticated: false, session: null });
    await hydratePromise;

    // Import getSnapshot via another hydrate skip — useAuth store state:
    // Force a no-op hydrate that returns current snapshot.
    const after = await hydrateSession();
    expect(after.status).toBe('authenticated');
    expect(after.session?.userId).toBe('user_1');
    expect(getAuthSession).toHaveBeenCalledTimes(1);
  });

  it('keeps useAuth export available for storefront consumers', () => {
    expect(typeof useAuth).toBe('function');
  });
});
