import Link from 'next/link';
import { safeReturnTo } from '@/lib/auth/return-to';

type AccountAuthRequiredProps = {
  next?: string;
};

export function AccountAuthRequired({ next }: AccountAuthRequiredProps) {
  const returnTo = safeReturnTo(next);
  const loginHref = returnTo
    ? `/account/login?next=${encodeURIComponent(returnTo)}`
    : '/account/login';
  const signupHref = returnTo
    ? `/account/signup?next=${encodeURIComponent(returnTo)}`
    : '/account/signup';

  return (
    <div className="account-page">
      <div className="account-shell">
        <div className="account-welcome" role="status">
          <p className="account-kicker">Welcome to Eckam</p>
          <h1 className="account-title">Sign in to continue.</h1>
          <p className="account-copy">
            Sign in to manage your account, addresses and orders.
          </p>
          <div className="account-actions">
            <Link href={loginHref} className="cart-cta cart-cta--primary">
              Sign in
            </Link>
            <Link href={signupHref} className="cart-cta cart-cta--ghost">
              Create account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
