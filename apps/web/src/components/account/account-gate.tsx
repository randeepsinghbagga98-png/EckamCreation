'use client';

import type { ReactNode } from 'react';
import { retryAuthSession, useAuth } from '@/lib/auth/session';
import { AccountAuthRequired } from './account-auth-required';
import { AccountLoading } from './account-loading';

type AccountGateProps = {
  children: ReactNode;
};

export function AccountGate({ children }: AccountGateProps) {
  const auth = useAuth();

  if (auth.status === 'loading') {
    return <AccountLoading />;
  }

  if (auth.status === 'error') {
    return (
      <div className="account-page">
        <div className="account-shell">
          <div className="account-welcome" role="alert">
            <p className="account-kicker">Account</p>
            <h1 className="account-title">Unable to confirm your session.</h1>
            <p className="account-copy">{auth.notice}</p>
            <button
              type="button"
              className="cart-cta cart-cta--primary"
              onClick={() => {
                void retryAuthSession();
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (auth.status !== 'authenticated') {
    return <AccountAuthRequired />;
  }

  return <>{children}</>;
}
